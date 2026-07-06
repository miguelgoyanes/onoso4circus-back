import { Fecha } from '../domain/fecha';

export interface FechaRepository {
  save(fecha: Fecha): Promise<void>;
  findById(id: string): Promise<Fecha | null>;
  findByPlaza(plazaId: string): Promise<Fecha[]>;
  delete(id: string): Promise<void>;
}

export const FECHA_REPOSITORY = Symbol('FECHA_REPOSITORY');
