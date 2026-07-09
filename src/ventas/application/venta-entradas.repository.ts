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
}

export const VENTA_ENTRADAS_REPOSITORY = Symbol('VENTA_ENTRADAS_REPOSITORY');
