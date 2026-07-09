import { VentaBar } from '../domain/venta-bar';

export interface VentaBarFilter {
  paseId?: string;
  fechaId?: string;
  plazaId?: string;
}

export interface VentaBarRepository {
  save(venta: VentaBar): Promise<void>;
  findById(id: string): Promise<VentaBar | null>;
  findAll(filter?: VentaBarFilter): Promise<VentaBar[]>;
  delete(id: string): Promise<void>;
}

export const VENTA_BAR_REPOSITORY = Symbol('VENTA_BAR_REPOSITORY');
