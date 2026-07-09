import { AjusteStock } from '../domain/ajuste-stock';

export interface AjusteStockRepository {
  save(ajuste: AjusteStock): Promise<void>;
  findById(id: string): Promise<AjusteStock | null>;
  findAll(productoId?: string): Promise<AjusteStock[]>;
  existeConProducto(productoId: string): Promise<boolean>;
  delete(id: string): Promise<void>;
}

export const AJUSTE_STOCK_REPOSITORY = Symbol('AJUSTE_STOCK_REPOSITORY');
