import { randomUUID } from 'crypto';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { Account, AccountType, TipoCuentaDinero } from '../domain/account';
import { JournalEntry } from '../domain/journal-entry';
import { JournalLine } from '../domain/journal-line';
import {
  EntriesByDimensionFilter,
  EntriesByFilter,
  JOURNAL_ENTRY_REPOSITORY,
  MovimientoCuenta,
} from './journal-entry.repository';
import type { JournalEntryRepository } from './journal-entry.repository';
import { ACCOUNT_REPOSITORY } from './account.repository';
import type { AccountRepository } from './account.repository';

@Injectable()
export class AccountingService {
  constructor(
    @Inject(JOURNAL_ENTRY_REPOSITORY)
    private readonly repository: JournalEntryRepository,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: AccountRepository,
  ) {}

  public async post(entry: JournalEntry): Promise<void> {
    entry.validateBalance();
    await this.repository.save(entry);
  }

  public async eliminarAsiento(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  public async entriesByDimension(
    filter: EntriesByDimensionFilter,
  ): Promise<JournalLine[]> {
    return this.repository.findLinesByDimension(filter);
  }

  public async crearCuenta(params: {
    nombre: string;
    code: string;
    type: AccountType;
    esCuentaDeDinero: boolean;
    tipoCuentaDinero?: TipoCuentaDinero;
    usableEnTaquilla?: boolean;
    usableEnBar?: boolean;
  }): Promise<Account> {
    const existente = await this.accountRepository.findByCode(params.code);
    if (existente) {
      throw new ConflictException(`Ya existe una cuenta con código ${params.code}`);
    }
    const account = new Account(
      randomUUID(),
      params.nombre,
      params.type,
      params.code,
      params.esCuentaDeDinero,
      params.tipoCuentaDinero,
      true,
      params.usableEnTaquilla ?? false,
      params.usableEnBar ?? false,
    );
    await this.accountRepository.save(account);
    return account;
  }

  public async eliminarCuenta(id: string): Promise<void> {
    await this.accountRepository.delete(id);
  }

  public async movimientosPorCuenta(accountId: string): Promise<MovimientoCuenta[]> {
    return this.repository.findMovimientosByAccount(accountId);
  }

  // Para Libro mayor: a diferencia de movimientosPorCuenta (todo el histórico, orden DESC,
  // usado por Tesorería), esta admite rango de fechas y devuelve orden ASC.
  public async movimientosPorCuentaEnRango(
    accountId: string,
    fechaDesde?: Date,
    fechaHasta?: Date,
  ): Promise<MovimientoCuenta[]> {
    return this.repository.findMovimientosByAccountEnRango(accountId, fechaDesde, fechaHasta);
  }

  // Para Libro diario: asientos completos (con todas sus líneas) filtrados por cuentas y/o fechas.
  public async listarAsientos(filter: EntriesByFilter): Promise<JournalEntry[]> {
    return this.repository.findEntriesByFilter(filter);
  }

  public async listarCuentas(): Promise<Account[]> {
    return this.accountRepository.findAll();
  }

  public async listarCuentasDeDinero(): Promise<Account[]> {
    return this.accountRepository.findCuentasDeDinero();
  }

  public async obtenerCuentaPorId(id: string): Promise<Account> {
    const cuenta = await this.accountRepository.findById(id);
    if (!cuenta) {
      throw new NotFoundException(`Cuenta ${id} no encontrada`);
    }
    return cuenta;
  }

  public async obtenerCuentaPorCodigo(code: string): Promise<Account> {
    const cuenta = await this.accountRepository.findByCode(code);
    if (!cuenta) {
      throw new NotFoundException(`No existe la cuenta ${code}. Créala primero en Tesorería.`);
    }
    return cuenta;
  }

  public async saldoPorCuenta(accountId: string): Promise<Decimal> {
    const lines = await this.entriesByDimension({ accountId });
    const totalDebit = lines.reduce((sum, line) => sum.plus(line.debit), new Decimal(0));
    const totalCredit = lines.reduce((sum, line) => sum.plus(line.credit), new Decimal(0));

    const account = lines[0]?.account ?? (await this.accountRepository.findById(accountId));
    const aumentaConDebito = !account || account.esDebitoNormal();

    return aumentaConDebito ? totalDebit.minus(totalCredit) : totalCredit.minus(totalDebit);
  }

  public async patrimonioLiquidoTotal(): Promise<Decimal> {
    const cuentas = await this.listarCuentasDeDinero();
    let total = new Decimal(0);
    for (const cuenta of cuentas) {
      total = total.plus(await this.saldoPorCuenta(cuenta.id));
    }
    return total;
  }
}
