import { Injectable } from '@nestjs/common';
import { Activo } from '../domain/activo';
import { ActivoFilter, ActivoRepository } from '../application/activo.repository';

@Injectable()
export class InMemoryActivoRepository implements ActivoRepository {
  private readonly activos = new Map<string, Activo>();

  public async save(activo: Activo): Promise<void> {
    this.activos.set(activo.id, activo);
  }

  public async findById(id: string): Promise<Activo | null> {
    return this.activos.get(id) ?? null;
  }

  public async findAll(filter?: ActivoFilter): Promise<Activo[]> {
    return [...this.activos.values()].filter((a) => {
      if (filter?.categoriaId && a.categoriaId !== filter.categoriaId) return false;
      return true;
    });
  }

  public async existeConCategoria(categoriaId: string): Promise<boolean> {
    return [...this.activos.values()].some((a) => a.categoriaId === categoriaId);
  }

  public async delete(id: string): Promise<void> {
    this.activos.delete(id);
  }
}
