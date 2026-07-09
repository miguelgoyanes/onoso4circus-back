import { AjusteArqueo } from '../domain/ajuste-arqueo';

export interface AjusteArqueoRepository {
  save(ajuste: AjusteArqueo): Promise<void>;
  findById(id: string): Promise<AjusteArqueo | null>;
  findByJournalEntryId(journalEntryId: string): Promise<AjusteArqueo | null>;
  delete(id: string): Promise<void>;
}

export const AJUSTE_ARQUEO_REPOSITORY = Symbol('AJUSTE_ARQUEO_REPOSITORY');
