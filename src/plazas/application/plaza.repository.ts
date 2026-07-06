import { Plaza } from '../domain/plaza';

export interface PlazaRepository {
  save(plaza: Plaza): Promise<void>;
  findById(id: string): Promise<Plaza | null>;
  findAll(): Promise<Plaza[]>;
  delete(id: string): Promise<void>;
}

export const PLAZA_REPOSITORY = Symbol('PLAZA_REPOSITORY');
