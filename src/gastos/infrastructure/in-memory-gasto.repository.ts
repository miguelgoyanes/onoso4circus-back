import { Injectable } from '@nestjs/common';
import { Gasto } from '../domain/gasto';
import { GastoFilter, GastoRepository } from '../application/gasto.repository';

@Injectable()
export class InMemoryGastoRepository implements GastoRepository {
  private readonly gastos = new Map<string, Gasto>();

  public async save(gasto: Gasto): Promise<void> {
    this.gastos.set(gasto.id, gasto);
  }

  public async findById(id: string): Promise<Gasto | null> {
    return this.gastos.get(id) ?? null;
  }

  public async findAll(filter?: GastoFilter): Promise<Gasto[]> {
    return [...this.gastos.values()].filter((g) => {
      if (filter?.plazaId && g.plazaId !== filter.plazaId) return false;
      if (filter?.categoriaId && g.categoriaId !== filter.categoriaId) return false;
      if (filter?.estadoPago && g.estadoPago !== filter.estadoPago) return false;
      return true;
    });
  }

  public async existeConCategoria(categoriaId: string): Promise<boolean> {
    return [...this.gastos.values()].some((g) => g.categoriaId === categoriaId);
  }

  public async delete(id: string): Promise<void> {
    this.gastos.delete(id);
  }
}
