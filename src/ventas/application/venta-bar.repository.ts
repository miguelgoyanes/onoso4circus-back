import { VentaBar } from '../domain/venta-bar';

export interface VentaBarFilter {
  paseId?: string;
  fechaId?: string;
  plazaId?: string;
  // Ventas creadas desde esta fecha (inclusive) — usado por CosteElaboradoService para
  // acotar la ventana de un lote de insumo (desde que se abrió, hasta que se cerró).
  desde?: Date;
  // Hasta esta fecha (exclusive) — junto con `desde`, delimita la ventana de un lote ya
  // cerrado. Sin `hasta`, se entiende "hasta ahora" (lote todavía activo).
  hasta?: Date;
}

export interface VentaBarRepository {
  save(venta: VentaBar): Promise<void>;
  findById(id: string): Promise<VentaBar | null>;
  findAll(filter?: VentaBarFilter): Promise<VentaBar[]>;
  delete(id: string): Promise<void>;
}

export const VENTA_BAR_REPOSITORY = Symbol('VENTA_BAR_REPOSITORY');
