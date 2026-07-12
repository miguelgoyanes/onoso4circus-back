import { VentaEntradas } from '../domain/venta-entradas';

export interface VentaEntradasFilter {
  paseId?: string;
  fechaId?: string;
  plazaId?: string;
}

export interface VentaEntradasRepository {
  save(venta: VentaEntradas): Promise<void>;
  findById(id: string): Promise<VentaEntradas | null>;
  findAll(filter?: VentaEntradasFilter): Promise<VentaEntradas[]>;
  existeConTipoEntrada(tipoEntradaId: string): Promise<boolean>;
  delete(id: string): Promise<void>;
  // Cuenta lotes de venta por la fecha REAL del evento (Fecha.fecha, vía join), no por
  // `creadoEn` — para KPIs anuales como el ticket medio. `hasta` exclusive.
  contarEnRango(desde: Date, hasta: Date): Promise<number>;
}

export const VENTA_ENTRADAS_REPOSITORY = Symbol('VENTA_ENTRADAS_REPOSITORY');
