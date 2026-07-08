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

export interface JournalEntryRepository {
  save(entry: JournalEntry): Promise<void>;
  findLinesByDimension(filter: EntriesByDimensionFilter): Promise<JournalLine[]>;
  delete(id: string): Promise<void>;
}

export const JOURNAL_ENTRY_REPOSITORY = Symbol('JOURNAL_ENTRY_REPOSITORY');
