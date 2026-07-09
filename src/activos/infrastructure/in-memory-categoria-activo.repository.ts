import { Injectable } from '@nestjs/common';
import { CategoriaActivo } from '../domain/categoria-activo';
import { CategoriaActivoRepository } from '../application/categoria-activo.repository';

@Injectable()
export class InMemoryCategoriaActivoRepository implements CategoriaActivoRepository {
  private readonly categorias = new Map<string, CategoriaActivo>();

  public async save(categoria: CategoriaActivo): Promise<void> {
    this.categorias.set(categoria.id, categoria);
  }

  public async findById(id: string): Promise<CategoriaActivo | null> {
    return this.categorias.get(id) ?? null;
  }

  public async findByNombre(nombre: string): Promise<CategoriaActivo | null> {
    return [...this.categorias.values()].find((c) => c.nombre === nombre) ?? null;
  }

  public async findAll(): Promise<CategoriaActivo[]> {
    return [...this.categorias.values()];
  }

  public async delete(id: string): Promise<void> {
    this.categorias.delete(id);
  }
}
