import { Injectable } from '@nestjs/common';
import { CategoriaGasto } from '../domain/categoria-gasto';
import { CategoriaGastoRepository } from '../application/categoria-gasto.repository';

@Injectable()
export class InMemoryCategoriaGastoRepository implements CategoriaGastoRepository {
  private readonly categorias = new Map<string, CategoriaGasto>();

  public async save(categoria: CategoriaGasto): Promise<void> {
    this.categorias.set(categoria.id, categoria);
  }

  public async findById(id: string): Promise<CategoriaGasto | null> {
    return this.categorias.get(id) ?? null;
  }

  public async findByNombre(nombre: string): Promise<CategoriaGasto | null> {
    return [...this.categorias.values()].find((c) => c.nombre === nombre) ?? null;
  }

  public async findAll(): Promise<CategoriaGasto[]> {
    return [...this.categorias.values()];
  }

  public async delete(id: string): Promise<void> {
    this.categorias.delete(id);
  }
}
