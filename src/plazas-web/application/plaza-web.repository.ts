import { PlazaWeb } from '../domain/plaza-web';

export interface PlazaWebRepository {
  save(plazaWeb: PlazaWeb): Promise<void>;
  findById(id: string): Promise<PlazaWeb | null>;
  findAll(): Promise<PlazaWeb[]>;
  delete(id: string): Promise<void>;
}

export const PLAZA_WEB_REPOSITORY = Symbol('PLAZA_WEB_REPOSITORY');
