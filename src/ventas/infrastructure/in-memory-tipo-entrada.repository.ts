import { Injectable } from '@nestjs/common';
import { TipoEntrada } from '../domain/tipo-entrada';
import { TipoEntradaRepository } from '../application/tipo-entrada.repository';

@Injectable()
export class InMemoryTipoEntradaRepository implements TipoEntradaRepository {
  private readonly tipos = new Map<string, TipoEntrada>();

  public async save(tipoEntrada: TipoEntrada): Promise<void> {
    this.tipos.set(tipoEntrada.id, tipoEntrada);
  }

  public async findById(id: string): Promise<TipoEntrada | null> {
    return this.tipos.get(id) ?? null;
  }

  public async findAll(): Promise<TipoEntrada[]> {
    return [...this.tipos.values()].sort((a, b) => a.orden - b.orden);
  }

  public async delete(id: string): Promise<void> {
    this.tipos.delete(id);
  }
}
