import { EstadoPagoGasto, Gasto } from '../domain/gasto';

export interface GastoFilter {
  plazaId?: string;
  categoriaId?: string;
  estadoPago?: EstadoPagoGasto;
}

export interface GastoRepository {
  save(gasto: Gasto): Promise<void>;
  findById(id: string): Promise<Gasto | null>;
  findAll(filter?: GastoFilter): Promise<Gasto[]>;
  existeConCategoria(categoriaId: string): Promise<boolean>;
  delete(id: string): Promise<void>;
}

export const GASTO_REPOSITORY = Symbol('GASTO_REPOSITORY');
