import Decimal from 'decimal.js';
import { Account } from './account';

export interface JournalLineDimensions {
  plazaId?: string;
  fechaId?: string;
  paseId?: string;
  categoryTag?: string;
  empleadoId?: string;
}

export class JournalLine {
  public readonly account: Account;
  public readonly debit: Decimal;
  public readonly credit: Decimal;
  public readonly dimensions: JournalLineDimensions;

  constructor(params: {
    account: Account;
    debit?: Decimal.Value;
    credit?: Decimal.Value;
    dimensions?: JournalLineDimensions;
  }) {
    this.account = params.account;
    this.debit = new Decimal(params.debit ?? 0);
    this.credit = new Decimal(params.credit ?? 0);
    this.dimensions = params.dimensions ?? {};

    if (this.debit.isNegative() || this.credit.isNegative()) {
      throw new Error('JournalLine: debit y credit no pueden ser negativos');
    }
    if (this.debit.isZero() && this.credit.isZero()) {
      throw new Error('JournalLine: una línea debe tener debit o credit distinto de cero');
    }
    if (!this.debit.isZero() && !this.credit.isZero()) {
      throw new Error('JournalLine: una línea no puede tener debit y credit a la vez');
    }
  }
}
