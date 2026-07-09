import { Transferencia } from '../domain/transferencia';

export interface TransferenciaRepository {
  save(transferencia: Transferencia): Promise<void>;
  findById(id: string): Promise<Transferencia | null>;
  findByJournalEntryId(journalEntryId: string): Promise<Transferencia | null>;
  delete(id: string): Promise<void>;
}

export const TRANSFERENCIA_REPOSITORY = Symbol('TRANSFERENCIA_REPOSITORY');
