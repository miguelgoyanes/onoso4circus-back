import { Pase } from '../domain/pase';

export interface PaseRepository {
  save(pase: Pase): Promise<void>;
  findById(id: string): Promise<Pase | null>;
  findByFecha(fechaId: string): Promise<Pase[]>;
  delete(id: string): Promise<void>;
}

export const PASE_REPOSITORY = Symbol('PASE_REPOSITORY');
