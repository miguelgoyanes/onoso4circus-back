import Decimal from 'decimal.js';
import { JournalLine } from './journal-line';

// Fecha contable de "hoy" truncada a medianoche — evita que un asiento posteado en el
// instante en que ocurre una acción (pagar un pendiente, transferir, ajustar arqueo...)
// quede desordenado en Libro diario/mayor frente a asientos con fecha elegida por el
// usuario (que siempre llega como fecha pura, sin hora) del mismo día calendario.
export function fechaContableDeHoy(): Date {
  return new Date(new Date().toISOString().slice(0, 10));
}

// El límite superior ("hasta") de un rango de fechas debe incluir TODO ese día — si se
// comparara solo contra su medianoche (new Date("2026-07-10") = 2026-07-10T00:00:00.000Z),
// un asiento de ese mismo día con hora (p. ej. un ajuste de stock, que sí guarda hora, o
// cualquier asiento anterior a que Tesorería truncara sus fechas) quedaría excluido de
// "hasta hoy" aunque sea de hoy. Se usa para el límite "hasta"/"fecha" de rangos; "desde"
// no lo necesita porque medianoche ya es el inicio del día.
export function finDeDia(fechaISO: string): Date {
  return new Date(new Date(fechaISO).getTime() + 24 * 60 * 60 * 1000 - 1);
}

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
