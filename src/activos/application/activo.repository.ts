import { Activo } from '../domain/activo';

export interface ActivoFilter {
  categoriaId?: string;
}

export interface ActivoRepository {
  save(activo: Activo): Promise<void>;
  findById(id: string): Promise<Activo | null>;
  findAll(filter?: ActivoFilter): Promise<Activo[]>;
  existeConCategoria(categoriaId: string): Promise<boolean>;
  delete(id: string): Promise<void>;
}

export const ACTIVO_REPOSITORY = Symbol('ACTIVO_REPOSITORY');
