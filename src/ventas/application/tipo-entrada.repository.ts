import { TipoEntrada } from '../domain/tipo-entrada';

export interface TipoEntradaRepository {
  save(tipoEntrada: TipoEntrada): Promise<void>;
  findById(id: string): Promise<TipoEntrada | null>;
  // Ordenados por `orden` ascendente.
  findAll(): Promise<TipoEntrada[]>;
  delete(id: string): Promise<void>;
}

export const TIPO_ENTRADA_REPOSITORY = Symbol('TIPO_ENTRADA_REPOSITORY');
