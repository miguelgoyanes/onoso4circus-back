import Decimal from 'decimal.js';
import { JournalEntry } from '../domain/journal-entry';
import { JournalLine } from '../domain/journal-line';

export interface EntriesByDimensionFilter {
  plazaId?: string;
  fechaId?: string;
  paseId?: string;
  accountId?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
}

// Un movimiento del "libro mayor" de una cuenta — a diferencia de JournalLine (que solo
// representa un lado de un asiento para postear), esto trae ya la fecha y la descripción
// humana del asiento al que pertenece, para mostrar en la ficha de la cuenta.
export interface MovimientoCuenta {
  journalEntryId: string;
  fecha: Date;
  descripcion: string;
  debit: Decimal;
  credit: Decimal;
}

export interface JournalEntryRepository {
  save(entry: JournalEntry): Promise<void>;
  findLinesByDimension(filter: EntriesByDimensionFilter): Promise<JournalLine[]>;
  findMovimientosByAccount(accountId: string): Promise<MovimientoCuenta[]>;
  delete(id: string): Promise<void>;
}

export const JOURNAL_ENTRY_REPOSITORY = Symbol('JOURNAL_ENTRY_REPOSITORY');
