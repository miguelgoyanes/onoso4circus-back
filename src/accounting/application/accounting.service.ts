import { randomUUID } from 'crypto';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { Account, AccountType } from '../domain/account';
import { JournalEntry } from '../domain/journal-entry';
import { JournalLine } from '../domain/journal-line';
import {
  EntriesByDimensionFilter,
  JOURNAL_ENTRY_REPOSITORY,
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
    );
    await this.accountRepository.save(account);
    return account;
  }

  public async listarCuentas(): Promise<Account[]> {
    return this.accountRepository.findAll();
  }

  public async listarCuentasDeDinero(): Promise<Account[]> {
    return this.accountRepository.findCuentasDeDinero();
  }

  public async saldoPorCuenta(accountId: string): Promise<Decimal> {
    const lines = await this.entriesByDimension({ accountId });
    const totalDebit = lines.reduce((sum, line) => sum.plus(line.debit), new Decimal(0));
    const totalCredit = lines.reduce((sum, line) => sum.plus(line.credit), new Decimal(0));

    const account = lines[0]?.account ?? (await this.accountRepository.findById(accountId));
    const aumentaConDebito =
      !account || account.type === AccountType.ASSET || account.type === AccountType.EXPENSE;

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
