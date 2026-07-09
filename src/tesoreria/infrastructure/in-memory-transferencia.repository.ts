import { Injectable } from '@nestjs/common';
import { Transferencia } from '../domain/transferencia';
import { TransferenciaRepository } from '../application/transferencia.repository';

@Injectable()
export class InMemoryTransferenciaRepository implements TransferenciaRepository {
  private readonly transferencias = new Map<string, Transferencia>();

  public async save(transferencia: Transferencia): Promise<void> {
    this.transferencias.set(transferencia.id, transferencia);
  }

  public async findById(id: string): Promise<Transferencia | null> {
    return this.transferencias.get(id) ?? null;
  }

  public async findByJournalEntryId(journalEntryId: string): Promise<Transferencia | null> {
    return [...this.transferencias.values()].find((t) => t.journalEntryId === journalEntryId) ?? null;
  }

  public async delete(id: string): Promise<void> {
    this.transferencias.delete(id);
  }
}
