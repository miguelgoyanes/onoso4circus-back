import { EstadoPagoGasto, Gasto, TipoGasto } from '../domain/gasto';

export interface GastoFilter {
  plazaId?: string;
  tipo?: TipoGasto;
  estadoPago?: EstadoPagoGasto;
}

export interface GastoRepository {
  save(gasto: Gasto): Promise<void>;
  findById(id: string): Promise<Gasto | null>;
  findAll(filter?: GastoFilter): Promise<Gasto[]>;
}

export const GASTO_REPOSITORY = Symbol('GASTO_REPOSITORY');
