import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { Account, AccountType, TipoCuentaDinero } from '../../accounting/domain/account';
import { JournalEntry } from '../../accounting/domain/journal-entry';
import { JournalLine } from '../../accounting/domain/journal-line';
import { MovimientoCuenta } from '../../accounting/application/journal-entry.repository';
import { AccountingService } from '../../accounting/application/accounting.service';
import { ACCOUNT_REPOSITORY } from '../../accounting/application/account.repository';
import type { AccountRepository } from '../../accounting/application/account.repository';
import { TipoMovimientoCapital } from '../domain/tipo-movimiento-capital';

const PREFIJO_CODIGO: Record<TipoCuentaDinero, string> = {
  [TipoCuentaDinero.CAJA]: '570',
  [TipoCuentaDinero.BANCO]: '572',
};

const CUENTA_CAPITAL = '100';

export interface CuentaConSaldo {
  cuenta: Account;
  saldo: Decimal;
}

@Injectable()
export class CuentaDineroService {
  constructor(
    private readonly accountingService: AccountingService,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepository,
  ) {}

  public async crear(
    nombre: string,
    tipo: TipoCuentaDinero,
    usableEnTaquilla: boolean,
    usableEnBar: boolean,
  ): Promise<Account> {
    const code = await this.siguienteCodigo(tipo);
    return this.accountingService.crearCuenta({
      nombre,
      code,
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
      tipoCuentaDinero: tipo,
      usableEnTaquilla,
      usableEnBar,
    });
  }

  // El tipo (BANCO/CAJA) y el código no se editan una vez creada la cuenta — el código
  // depende del tipo, y renumerar cuentas ya usadas sería más confuso que útil.
  public async actualizar(
    id: string,
    nombre: string,
    usableEnTaquilla: boolean,
    usableEnBar: boolean,
  ): Promise<Account> {
    const cuenta = await this.buscarCuentaDineroOFallar(id);
    const actualizada = cuenta.conDatos(nombre, usableEnTaquilla, usableEnBar);
    await this.accountRepository.save(actualizada);
    return actualizada;
  }

  public async activar(id: string): Promise<Account> {
    const cuenta = await this.buscarCuentaDineroOFallar(id);
    const actualizada = cuenta.activada();
    await this.accountRepository.save(actualizada);
    return actualizada;
  }

  public async desactivar(id: string): Promise<Account> {
    const cuenta = await this.buscarCuentaDineroOFallar(id);
    const actualizada = cuenta.desactivada();
    await this.accountRepository.save(actualizada);
    return actualizada;
  }

  public async eliminar(id: string): Promise<void> {
    await this.buscarCuentaDineroOFallar(id);
    const movimientos = await this.accountingService.entriesByDimension({ accountId: id });
    if (movimientos.length > 0) {
      throw new ConflictException('No se puede eliminar una cuenta con movimientos; desactívala en su lugar');
    }
    await this.accountingService.eliminarCuenta(id);
  }

  // Solo las cuentas creadas desde Tesorería (con tipoCuentaDinero) — las cuentas fijas de
  // los demás módulos (700001, 600001...) no aparecen aquí.
  public async listar(): Promise<CuentaConSaldo[]> {
    const cuentas = (await this.accountRepository.findAll()).filter((c) => c.tipoCuentaDinero != null);
    return Promise.all(cuentas.map(async (cuenta) => this.conSaldo(cuenta)));
  }

  public async obtener(id: string): Promise<CuentaConSaldo> {
    const cuenta = await this.buscarCuentaDineroOFallar(id);
    return this.conSaldo(cuenta);
  }

  public async movimientos(id: string): Promise<MovimientoCuenta[]> {
    await this.buscarCuentaDineroOFallar(id);
    return this.accountingService.movimientosPorCuenta(id);
  }

  public async transferir(origenId: string, destinoId: string, importe: number, concepto?: string): Promise<void> {
    if (origenId === destinoId) {
      throw new BadRequestException('La cuenta de origen y la de destino no pueden ser la misma');
    }
    const origen = await this.buscarCuentaDineroActiva(origenId);
    const destino = await this.buscarCuentaDineroActiva(destinoId);
    const monto = new Decimal(importe);
    const descripcion = `Transferencia: ${origen.name} → ${destino.name}${concepto ? ` — ${concepto}` : ''}`;

    await this.accountingService.post(
      new JournalEntry({
        id: randomUUID(),
        date: new Date(),
        description: descripcion,
        lines: [
          new JournalLine({ account: destino, debit: monto }),
          new JournalLine({ account: origen, credit: monto }),
        ],
      }),
    );
  }

  // Usa la cuenta 100 (Capital) por debajo, sembrada por TesoreriaSeedService — nunca se
  // expone al cliente, que solo elige ENTRADA/SALIDA.
  public async registrarMovimientoCapital(
    cuentaId: string,
    tipo: TipoMovimientoCapital,
    importe: number,
    concepto?: string,
  ): Promise<void> {
    const cuenta = await this.buscarCuentaDineroActiva(cuentaId);
    const capital = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_CAPITAL);
    const monto = new Decimal(importe);
    const base = tipo === TipoMovimientoCapital.ENTRADA ? 'Aportación de capital' : 'Retirada de capital';
    const descripcion = concepto ? `${base} — ${concepto}` : base;

    const lines =
      tipo === TipoMovimientoCapital.ENTRADA
        ? [new JournalLine({ account: cuenta, debit: monto }), new JournalLine({ account: capital, credit: monto })]
        : [new JournalLine({ account: capital, debit: monto }), new JournalLine({ account: cuenta, credit: monto })];

    await this.accountingService.post(
      new JournalEntry({ id: randomUUID(), date: new Date(), description: descripcion, lines }),
    );
  }

  private async conSaldo(cuenta: Account): Promise<CuentaConSaldo> {
    return { cuenta, saldo: await this.accountingService.saldoPorCuenta(cuenta.id) };
  }

  private async buscarCuentaDineroActiva(id: string): Promise<Account> {
    const cuenta = await this.buscarCuentaDineroOFallar(id);
    if (!cuenta.activa) {
      throw new BadRequestException('La cuenta está desactivada');
    }
    return cuenta;
  }

  private async siguienteCodigo(tipo: TipoCuentaDinero): Promise<string> {
    const prefijo = PREFIJO_CODIGO[tipo];
    const sufijoValido = new RegExp(`^${prefijo}(\\d{3})$`);
    const todas = await this.accountRepository.findAll();
    const sufijos = todas
      .map((c) => c.code.match(sufijoValido)?.[1])
      // Regex estricta a propósito (no basta con "no es NaN"): Number('8e7') se interpreta
      // como notación científica (80000000), y hay cuentas de cuentas antiguas con códigos
      // hexadecimales que colaban ahí.
      .filter((sufijo): sufijo is string => sufijo != null)
      .map((sufijo) => Number(sufijo));
    const siguiente = sufijos.length > 0 ? Math.max(...sufijos) + 1 : 1;
    return `${prefijo}${String(siguiente).padStart(3, '0')}`;
  }

  private async buscarCuentaDineroOFallar(id: string): Promise<Account> {
    const cuenta = await this.accountRepository.findById(id);
    if (!cuenta || !cuenta.esCuentaDeDinero) {
      throw new NotFoundException('Cuenta no encontrada');
    }
    return cuenta;
  }
}
