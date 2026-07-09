import { Injectable } from '@nestjs/common';
import { MovimientoCapital } from '../domain/movimiento-capital';
import { MovimientoCapitalRepository } from '../application/movimiento-capital.repository';

@Injectable()
export class InMemoryMovimientoCapitalRepository implements MovimientoCapitalRepository {
  private readonly movimientos = new Map<string, MovimientoCapital>();

  public async save(movimiento: MovimientoCapital): Promise<void> {
    this.movimientos.set(movimiento.id, movimiento);
  }

  public async findById(id: string): Promise<MovimientoCapital | null> {
    return this.movimientos.get(id) ?? null;
  }

  public async findByJournalEntryId(journalEntryId: string): Promise<MovimientoCapital | null> {
    return [...this.movimientos.values()].find((m) => m.journalEntryId === journalEntryId) ?? null;
  }

  public async delete(id: string): Promise<void> {
    this.movimientos.delete(id);
  }
}
