import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { Account, AccountType, TipoCuentaDinero } from '../../accounting/domain/account';
import { fechaContableDeHoy, JournalEntry } from '../../accounting/domain/journal-entry';
import { JournalLine } from '../../accounting/domain/journal-line';
import { MovimientoCuenta } from '../../accounting/application/journal-entry.repository';
import { AccountingService } from '../../accounting/application/accounting.service';
import { ACCOUNT_REPOSITORY } from '../../accounting/application/account.repository';
import type { AccountRepository } from '../../accounting/application/account.repository';
import { TipoMovimientoCapital } from '../domain/tipo-movimiento-capital';
import { Transferencia } from '../domain/transferencia';
import { TRANSFERENCIA_REPOSITORY } from './transferencia.repository';
import type { TransferenciaRepository } from './transferencia.repository';
import { MovimientoCapital } from '../domain/movimiento-capital';
import { MOVIMIENTO_CAPITAL_REPOSITORY } from './movimiento-capital.repository';
import type { MovimientoCapitalRepository } from './movimiento-capital.repository';
import { AjusteArqueo } from '../domain/ajuste-arqueo';
import { AJUSTE_ARQUEO_REPOSITORY } from './ajuste-arqueo.repository';
import type { AjusteArqueoRepository } from './ajuste-arqueo.repository';

const PREFIJO_CODIGO: Record<TipoCuentaDinero, string> = {
  [TipoCuentaDinero.CAJA]: '570',
  [TipoCuentaDinero.BANCO]: '572',
};

const CUENTA_CAPITAL = '100';
const CUENTA_DIFERENCIA_FALTA = '668001';
const CUENTA_DIFERENCIA_SOBRA = '778001';

export interface CuentaConSaldo {
  cuenta: Account;
  saldo: Decimal;
}

export type OrigenMovimiento = 'TRANSFERENCIA' | 'CAPITAL' | 'AJUSTE_ARQUEO';

export interface MovimientoCuentaConOrigen extends MovimientoCuenta {
  // null cuando el movimiento viene de otro módulo (Ventas/Gastos/Contratos/Stock) — esos no
  // se editan desde Tesorería, cada uno se edita desde su propia pantalla.
  origenTipo: OrigenMovimiento | null;
  origenId: string | null;
}

@Injectable()
export class CuentaDineroService {
  constructor(
    private readonly accountingService: AccountingService,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepository,
    @Inject(TRANSFERENCIA_REPOSITORY) private readonly transferenciaRepository: TransferenciaRepository,
    @Inject(MOVIMIENTO_CAPITAL_REPOSITORY) private readonly movimientoCapitalRepository: MovimientoCapitalRepository,
    @Inject(AJUSTE_ARQUEO_REPOSITORY) private readonly ajusteArqueoRepository: AjusteArqueoRepository,
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

  public async movimientos(id: string): Promise<MovimientoCuentaConOrigen[]> {
    await this.buscarCuentaDineroOFallar(id);
    const movimientos = await this.accountingService.movimientosPorCuenta(id);
    return Promise.all(movimientos.map((m) => this.conOrigen(m)));
  }

  private async conOrigen(movimiento: MovimientoCuenta): Promise<MovimientoCuentaConOrigen> {
    const [transferencia, capital, ajuste] = await Promise.all([
      this.transferenciaRepository.findByJournalEntryId(movimiento.journalEntryId),
      this.movimientoCapitalRepository.findByJournalEntryId(movimiento.journalEntryId),
      this.ajusteArqueoRepository.findByJournalEntryId(movimiento.journalEntryId),
    ]);
    if (transferencia) return { ...movimiento, origenTipo: 'TRANSFERENCIA', origenId: transferencia.id };
    if (capital) return { ...movimiento, origenTipo: 'CAPITAL', origenId: capital.id };
    if (ajuste) return { ...movimiento, origenTipo: 'AJUSTE_ARQUEO', origenId: ajuste.id };
    return { ...movimiento, origenTipo: null, origenId: null };
  }

  public async transferir(origenId: string, destinoId: string, importe: number, concepto?: string): Promise<Transferencia> {
    if (origenId === destinoId) {
      throw new BadRequestException('La cuenta de origen y la de destino no pueden ser la misma');
    }
    const origen = await this.buscarCuentaDineroActiva(origenId);
    const destino = await this.buscarCuentaDineroActiva(destinoId);
    const monto = new Decimal(importe);
    const journalEntryId = randomUUID();
    await this.postearTransferencia(journalEntryId, origen, destino, monto, concepto);

    const transferencia = new Transferencia({
      id: randomUUID(),
      origenId,
      destinoId,
      importe: monto,
      concepto,
      journalEntryId,
      fecha: new Date(),
    });
    await this.transferenciaRepository.save(transferencia);
    return transferencia;
  }

  public async actualizarTransferencia(
    id: string,
    origenId: string,
    destinoId: string,
    importe: number,
    concepto?: string,
  ): Promise<Transferencia> {
    if (origenId === destinoId) {
      throw new BadRequestException('La cuenta de origen y la de destino no pueden ser la misma');
    }
    const anterior = await this.buscarTransferenciaOFallar(id);
    await this.accountingService.eliminarAsiento(anterior.journalEntryId);

    const origen = await this.buscarCuentaDineroActiva(origenId);
    const destino = await this.buscarCuentaDineroActiva(destinoId);
    const monto = new Decimal(importe);
    const journalEntryId = randomUUID();
    await this.postearTransferencia(journalEntryId, origen, destino, monto, concepto);

    const actualizada = anterior.actualizada({ origenId, destinoId, importe: monto, concepto, journalEntryId });
    await this.transferenciaRepository.save(actualizada);
    return actualizada;
  }

  public async eliminarTransferencia(id: string): Promise<void> {
    const transferencia = await this.buscarTransferenciaOFallar(id);
    await this.accountingService.eliminarAsiento(transferencia.journalEntryId);
    await this.transferenciaRepository.delete(id);
  }

  private async postearTransferencia(
    journalEntryId: string,
    origen: Account,
    destino: Account,
    monto: Decimal,
    concepto?: string,
  ): Promise<void> {
    const descripcion = `Transferencia: ${origen.name} → ${destino.name}${concepto ? ` — ${concepto}` : ''}`;
    await this.accountingService.post(
      new JournalEntry({
        id: journalEntryId,
        date: fechaContableDeHoy(),
        description: descripcion,
        lines: [new JournalLine({ account: destino, debit: monto }), new JournalLine({ account: origen, credit: monto })],
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
  ): Promise<MovimientoCapital> {
    const cuenta = await this.buscarCuentaDineroActiva(cuentaId);
    const monto = new Decimal(importe);
    const journalEntryId = randomUUID();
    await this.postearMovimientoCapital(journalEntryId, cuenta, tipo, monto, concepto);

    const movimiento = new MovimientoCapital({
      id: randomUUID(),
      cuentaId,
      tipo,
      importe: monto,
      concepto,
      journalEntryId,
      fecha: new Date(),
    });
    await this.movimientoCapitalRepository.save(movimiento);
    return movimiento;
  }

  public async actualizarMovimientoCapital(
    id: string,
    tipo: TipoMovimientoCapital,
    importe: number,
    concepto?: string,
  ): Promise<MovimientoCapital> {
    const anterior = await this.buscarMovimientoCapitalOFallar(id);
    await this.accountingService.eliminarAsiento(anterior.journalEntryId);

    const cuenta = await this.buscarCuentaDineroActiva(anterior.cuentaId);
    const monto = new Decimal(importe);
    const journalEntryId = randomUUID();
    await this.postearMovimientoCapital(journalEntryId, cuenta, tipo, monto, concepto);

    const actualizado = anterior.actualizado({ tipo, importe: monto, concepto, journalEntryId });
    await this.movimientoCapitalRepository.save(actualizado);
    return actualizado;
  }

  public async eliminarMovimientoCapital(id: string): Promise<void> {
    const movimiento = await this.buscarMovimientoCapitalOFallar(id);
    await this.accountingService.eliminarAsiento(movimiento.journalEntryId);
    await this.movimientoCapitalRepository.delete(id);
  }

  private async postearMovimientoCapital(
    journalEntryId: string,
    cuenta: Account,
    tipo: TipoMovimientoCapital,
    monto: Decimal,
    concepto?: string,
  ): Promise<void> {
    const capital = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_CAPITAL);
    const base = tipo === TipoMovimientoCapital.ENTRADA ? 'Aportación de capital' : 'Retirada de capital';
    const descripcion = concepto ? `${base} — ${concepto}` : base;
    const lines =
      tipo === TipoMovimientoCapital.ENTRADA
        ? [new JournalLine({ account: cuenta, debit: monto }), new JournalLine({ account: capital, credit: monto })]
        : [new JournalLine({ account: capital, debit: monto }), new JournalLine({ account: cuenta, credit: monto })];
    await this.accountingService.post(
      new JournalEntry({ id: journalEntryId, date: fechaContableDeHoy(), description: descripcion, lines }),
    );
  }

  // Registro de un solo paso: se compara el saldo teórico actual contra lo que el usuario
  // dice que hay realmente, y la diferencia se ajusta contra 668001/778001 — sin apertura ni
  // cierre, sin cuenta origen/destino. Sustituye al ciclo de arqueo abierto/cerrado anterior:
  // ver project_revision_backlog_post_tesoreria en memoria para el porqué del cambio.
  public async crearAjusteArqueo(cuentaId: string, importeReal: number, concepto?: string): Promise<AjusteArqueo> {
    const cuenta = await this.buscarCajaActivaOFallar(cuentaId);
    const teorico = await this.accountingService.saldoPorCuenta(cuentaId);
    const real = new Decimal(importeReal);
    const { diferencia, journalEntryId } = await this.postearDiferenciaAjuste(cuenta, teorico, real);

    const ajuste = new AjusteArqueo({
      id: randomUUID(),
      cuentaId,
      importeTeorico: teorico,
      importeReal: real,
      diferencia,
      journalEntryId,
      concepto,
      fecha: new Date(),
    });
    await this.ajusteArqueoRepository.save(ajuste);
    return ajuste;
  }

  public async actualizarAjusteArqueo(id: string, importeReal: number, concepto?: string): Promise<AjusteArqueo> {
    const anterior = await this.buscarAjusteArqueoOFallar(id);
    if (anterior.journalEntryId) {
      await this.accountingService.eliminarAsiento(anterior.journalEntryId);
    }
    const cuenta = await this.buscarCajaActivaOFallar(anterior.cuentaId);
    const teorico = await this.accountingService.saldoPorCuenta(anterior.cuentaId);
    const real = new Decimal(importeReal);
    const { diferencia, journalEntryId } = await this.postearDiferenciaAjuste(cuenta, teorico, real);

    const actualizado = anterior.actualizado({ importeTeorico: teorico, importeReal: real, diferencia, journalEntryId, concepto });
    await this.ajusteArqueoRepository.save(actualizado);
    return actualizado;
  }

  public async eliminarAjusteArqueo(id: string): Promise<void> {
    const ajuste = await this.buscarAjusteArqueoOFallar(id);
    if (ajuste.journalEntryId) {
      await this.accountingService.eliminarAsiento(ajuste.journalEntryId);
    }
    await this.ajusteArqueoRepository.delete(id);
  }

  // decimal.js considera 0 "positivo" (isPositive/isNegative solo miran el signo) — hay que
  // comparar magnitud contra 0 explícitamente, ver memoria feedback_decimaljs_ispositive_zero.
  private async postearDiferenciaAjuste(
    cuenta: Account,
    teorico: Decimal,
    real: Decimal,
  ): Promise<{ diferencia: Decimal; journalEntryId: string | undefined }> {
    const diferencia = real.minus(teorico);
    if (diferencia.isZero()) {
      return { diferencia, journalEntryId: undefined };
    }

    let lines: JournalLine[];
    if (diferencia.greaterThan(0)) {
      const sobra = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_DIFERENCIA_SOBRA);
      lines = [new JournalLine({ account: cuenta, debit: diferencia }), new JournalLine({ account: sobra, credit: diferencia })];
    } else {
      const falta = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_DIFERENCIA_FALTA);
      const importeFalta = diferencia.abs();
      lines = [
        new JournalLine({ account: falta, debit: importeFalta }),
        new JournalLine({ account: cuenta, credit: importeFalta }),
      ];
    }

    const journalEntryId = randomUUID();
    await this.accountingService.post(
      new JournalEntry({
        id: journalEntryId,
        date: fechaContableDeHoy(),
        description: `Ajuste de arqueo: ${cuenta.name}`,
        lines,
      }),
    );
    return { diferencia, journalEntryId };
  }

  // Los 3 siguientes existen solo para poder precargar los modales de edición del frontend
  // con los valores actuales — reutilizan los mismos "buscarOFallar" privados de más abajo.
  public async obtenerTransferencia(id: string): Promise<Transferencia> {
    return this.buscarTransferenciaOFallar(id);
  }

  public async obtenerMovimientoCapital(id: string): Promise<MovimientoCapital> {
    return this.buscarMovimientoCapitalOFallar(id);
  }

  public async obtenerAjusteArqueo(id: string): Promise<AjusteArqueo> {
    return this.buscarAjusteArqueoOFallar(id);
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

  private async buscarCajaActivaOFallar(id: string): Promise<Account> {
    const cuenta = await this.buscarCuentaDineroActiva(id);
    if (cuenta.tipoCuentaDinero !== TipoCuentaDinero.CAJA) {
      throw new BadRequestException('El ajuste de arqueo solo se puede hacer sobre una cuenta de tipo Caja');
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

  private async buscarTransferenciaOFallar(id: string): Promise<Transferencia> {
    const transferencia = await this.transferenciaRepository.findById(id);
    if (!transferencia) {
      throw new NotFoundException('Transferencia no encontrada');
    }
    return transferencia;
  }

  private async buscarMovimientoCapitalOFallar(id: string): Promise<MovimientoCapital> {
    const movimiento = await this.movimientoCapitalRepository.findById(id);
    if (!movimiento) {
      throw new NotFoundException('Movimiento de capital no encontrado');
    }
    return movimiento;
  }

  private async buscarAjusteArqueoOFallar(id: string): Promise<AjusteArqueo> {
    const ajuste = await this.ajusteArqueoRepository.findById(id);
    if (!ajuste) {
      throw new NotFoundException('Ajuste de arqueo no encontrado');
    }
    return ajuste;
  }
}
