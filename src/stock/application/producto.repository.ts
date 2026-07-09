import { Producto } from '../domain/producto';

export interface ProductoRepository {
  save(producto: Producto): Promise<void>;
  findById(id: string): Promise<Producto | null>;
  findAll(): Promise<Producto[]>;
  delete(id: string): Promise<void>;
}

export const PRODUCTO_REPOSITORY = Symbol('PRODUCTO_REPOSITORY');
