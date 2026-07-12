import Decimal from 'decimal.js';
import { EntityManager } from 'typeorm';
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

// Para Libro diario: a diferencia de EntriesByDimensionFilter (que acepta una sola cuenta y
// devuelve líneas sueltas), esta admite varias cuentas y se usa para traer asientos completos.
export interface EntriesByFilter {
  accountIds?: string[];
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
  // manager: si se pasa (Fase 0 — reclasificarLote transaccional), se usa esa conexión
  // transaccional en vez de la conexión por defecto. Las implementaciones in-memory lo
  // ignoran.
  save(entry: JournalEntry, manager?: EntityManager): Promise<void>;
  findLinesByDimension(filter: EntriesByDimensionFilter): Promise<JournalLine[]>;
  findMovimientosByAccount(accountId: string): Promise<MovimientoCuenta[]>;
  findMovimientosByAccountEnRango(
    accountId: string,
    fechaDesde?: Date,
    fechaHasta?: Date,
  ): Promise<MovimientoCuenta[]>;
  findEntriesByFilter(filter: EntriesByFilter): Promise<JournalEntry[]>;
  delete(id: string, manager?: EntityManager): Promise<void>;
}

export const JOURNAL_ENTRY_REPOSITORY = Symbol('JOURNAL_ENTRY_REPOSITORY');
