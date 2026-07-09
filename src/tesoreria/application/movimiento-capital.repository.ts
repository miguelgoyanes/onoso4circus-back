import { MovimientoCapital } from '../domain/movimiento-capital';

export interface MovimientoCapitalRepository {
  save(movimiento: MovimientoCapital): Promise<void>;
  findById(id: string): Promise<MovimientoCapital | null>;
  findByJournalEntryId(journalEntryId: string): Promise<MovimientoCapital | null>;
  delete(id: string): Promise<void>;
}

export const MOVIMIENTO_CAPITAL_REPOSITORY = Symbol('MOVIMIENTO_CAPITAL_REPOSITORY');
