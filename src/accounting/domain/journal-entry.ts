import Decimal from 'decimal.js';
import { JournalLine } from './journal-line';

export class JournalEntry {
  public readonly id: string;
  public readonly date: Date;
  public readonly description: string;
  public readonly lines: JournalLine[];

  constructor(params: {
    id: string;
    date: Date;
    description: string;
    lines: JournalLine[];
  }) {
    if (params.lines.length < 2) {
      throw new Error('JournalEntry: se necesitan al menos 2 líneas');
    }
    this.id = params.id;
    this.date = params.date;
    this.description = params.description;
    this.lines = params.lines;
  }

  public totalDebit(): Decimal {
    return this.lines.reduce((sum, line) => sum.plus(line.debit), new Decimal(0));
  }

  public totalCredit(): Decimal {
    return this.lines.reduce((sum, line) => sum.plus(line.credit), new Decimal(0));
  }

  public isBalanced(): boolean {
    return this.totalDebit().equals(this.totalCredit());
  }

  public validateBalance(): void {
    if (!this.isBalanced()) {
      throw new Error(
        `JournalEntry desbalanceado: debe=${this.totalDebit().toString()} haber=${this.totalCredit().toString()}`,
      );
    }
  }
}
