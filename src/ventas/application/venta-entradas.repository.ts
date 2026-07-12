import { EntityManager } from 'typeorm';
import { VentaEntradas } from '../domain/venta-entradas';

export interface VentaEntradasFilter {
  paseId?: string;
  fechaId?: string;
  plazaId?: string;
}

export interface VentaEntradasRepository {
  // manager: ver VentaBarRepository — mismo mecanismo para que reclasificarLote sea
  // transaccional (Fase 0).
  save(venta: VentaEntradas, manager?: EntityManager): Promise<void>;
  findById(id: string): Promise<VentaEntradas | null>;
  findAll(filter?: VentaEntradasFilter): Promise<VentaEntradas[]>;
  existeConTipoEntrada(tipoEntradaId: string): Promise<boolean>;
  delete(id: string): Promise<void>;
  // Cuenta lotes de venta por la fecha REAL del evento (Fecha.fecha, vía join), no por
  // `creadoEn` — para KPIs anuales como el ticket medio. `hasta` exclusive.
  contarEnRango(desde: Date, hasta: Date): Promise<number>;
  // Igual que contarEnRango (mismo join a fechas, mismo criterio `hasta` exclusive) pero
  // devuelve las ventas completas — para el resumen de reclasificación de IVA por periodo.
  listarEnRangoReal(desde: Date, hasta: Date): Promise<VentaEntradas[]>;
}

export const VENTA_ENTRADAS_REPOSITORY = Symbol('VENTA_ENTRADAS_REPOSITORY');
