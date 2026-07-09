import { Injectable } from '@nestjs/common';
import { AjusteArqueo } from '../domain/ajuste-arqueo';
import { AjusteArqueoRepository } from '../application/ajuste-arqueo.repository';

@Injectable()
export class InMemoryAjusteArqueoRepository implements AjusteArqueoRepository {
  private readonly ajustes = new Map<string, AjusteArqueo>();

  public async save(ajuste: AjusteArqueo): Promise<void> {
    this.ajustes.set(ajuste.id, ajuste);
  }

  public async findById(id: string): Promise<AjusteArqueo | null> {
    return this.ajustes.get(id) ?? null;
  }

  public async findByJournalEntryId(journalEntryId: string): Promise<AjusteArqueo | null> {
    return [...this.ajustes.values()].find((a) => a.journalEntryId === journalEntryId) ?? null;
  }

  public async delete(id: string): Promise<void> {
    this.ajustes.delete(id);
  }
}
