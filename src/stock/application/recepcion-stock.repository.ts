import { RecepcionStock } from '../domain/recepcion-stock';
import { EstadoPagoRecepcion } from '../domain/estado-pago-recepcion';

export interface RecepcionStockFilter {
  productoId?: string;
  estadoPago?: EstadoPagoRecepcion;
}

export interface RecepcionStockRepository {
  save(recepcion: RecepcionStock): Promise<void>;
  findById(id: string): Promise<RecepcionStock | null>;
  findAll(filter?: RecepcionStockFilter): Promise<RecepcionStock[]>;
  existeConProducto(productoId: string): Promise<boolean>;
  delete(id: string): Promise<void>;
}

export const RECEPCION_STOCK_REPOSITORY = Symbol('RECEPCION_STOCK_REPOSITORY');
