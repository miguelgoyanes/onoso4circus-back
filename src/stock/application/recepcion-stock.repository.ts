import { RecepcionStock } from '../domain/recepcion-stock';

export interface RecepcionStockRepository {
  save(recepcion: RecepcionStock): Promise<void>;
  findById(id: string): Promise<RecepcionStock | null>;
  findAll(productoId?: string): Promise<RecepcionStock[]>;
  existeConProducto(productoId: string): Promise<boolean>;
  delete(id: string): Promise<void>;
}

export const RECEPCION_STOCK_REPOSITORY = Symbol('RECEPCION_STOCK_REPOSITORY');
