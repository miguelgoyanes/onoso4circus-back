import { CategoriaActivo } from '../domain/categoria-activo';

export interface CategoriaActivoRepository {
  save(categoria: CategoriaActivo): Promise<void>;
  findById(id: string): Promise<CategoriaActivo | null>;
  findByNombre(nombre: string): Promise<CategoriaActivo | null>;
  findAll(): Promise<CategoriaActivo[]>;
  delete(id: string): Promise<void>;
}

export const CATEGORIA_ACTIVO_REPOSITORY = Symbol('CATEGORIA_ACTIVO_REPOSITORY');
