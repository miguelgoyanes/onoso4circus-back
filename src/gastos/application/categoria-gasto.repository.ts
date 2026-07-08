import { CategoriaGasto } from '../domain/categoria-gasto';

export interface CategoriaGastoRepository {
  save(categoria: CategoriaGasto): Promise<void>;
  findById(id: string): Promise<CategoriaGasto | null>;
  findByNombre(nombre: string): Promise<CategoriaGasto | null>;
  findAll(): Promise<CategoriaGasto[]>;
  delete(id: string): Promise<void>;
}

export const CATEGORIA_GASTO_REPOSITORY = Symbol('CATEGORIA_GASTO_REPOSITORY');
