import { Injectable } from '@nestjs/common';
import { JournalEntry } from '../domain/journal-entry';
import { JournalLine } from '../domain/journal-line';
import {
  EntriesByDimensionFilter,
  JournalEntryRepository,
  MovimientoCuenta,
} from '../application/journal-entry.repository';

@Injectable()
export class InMemoryJournalEntryRepository implements JournalEntryRepository {
  private entries: JournalEntry[] = [];

  public async save(entry: JournalEntry): Promise<void> {
    this.entries.push(entry);
  }

  public async delete(id: string): Promise<void> {
    this.entries = this.entries.filter((entry) => entry.id !== id);
  }

  public async findLinesByDimension(
    filter: EntriesByDimensionFilter,
  ): Promise<JournalLine[]> {
    const result: JournalLine[] = [];
    for (const entry of this.entries) {
      if (filter.fechaDesde && entry.date < filter.fechaDesde) continue;
      if (filter.fechaHasta && entry.date > filter.fechaHasta) continue;

      for (const line of entry.lines) {
        if (filter.plazaId && line.dimensions.plazaId !== filter.plazaId) continue;
        if (filter.fechaId && line.dimensions.fechaId !== filter.fechaId) continue;
        if (filter.paseId && line.dimensions.paseId !== filter.paseId) continue;
        if (filter.accountId && line.account.id !== filter.accountId) continue;
        result.push(line);
      }
    }
    return result;
  }

  public async findMovimientosByAccount(accountId: string): Promise<MovimientoCuenta[]> {
    const result: MovimientoCuenta[] = [];
    for (const entry of this.entries) {
      for (const line of entry.lines) {
        if (line.account.id !== accountId) continue;
        result.push({
          journalEntryId: entry.id,
          fecha: entry.date,
          descripcion: entry.description,
          debit: line.debit,
          credit: line.credit,
        });
      }
    }
    return result.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }
}
