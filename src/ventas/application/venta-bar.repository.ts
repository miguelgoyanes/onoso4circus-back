import { EntityManager } from 'typeorm';
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
  // manager: ver JournalEntryRepository — mismo mecanismo para que reclasificarLote sea
  // transaccional (Fase 0).
  save(venta: VentaBar, manager?: EntityManager): Promise<void>;
  findById(id: string): Promise<VentaBar | null>;
  findAll(filter?: VentaBarFilter): Promise<VentaBar[]>;
  delete(id: string): Promise<void>;
  // Cuenta ventas por la fecha REAL del evento (Fecha.fecha, vía join), no por `creadoEn`
  // (fecha de alta) — para KPIs anuales como el ticket medio. `hasta` exclusive.
  contarEnRango(desde: Date, hasta: Date): Promise<number>;
  // Igual que contarEnRango (mismo join a fechas, mismo criterio `hasta` exclusive) pero
  // devuelve las ventas completas — para el resumen de reclasificación de IVA por periodo.
  listarEnRangoReal(desde: Date, hasta: Date): Promise<VentaBar[]>;
}

export const VENTA_BAR_REPOSITORY = Symbol('VENTA_BAR_REPOSITORY');
