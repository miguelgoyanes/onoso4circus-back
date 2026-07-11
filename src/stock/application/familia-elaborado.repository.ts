import { FamiliaElaborado } from '../domain/familia-elaborado';

export interface FamiliaElaboradoRepository {
  save(familia: FamiliaElaborado): Promise<void>;
  findById(id: string): Promise<FamiliaElaborado | null>;
  findAll(): Promise<FamiliaElaborado[]>;
  delete(id: string): Promise<void>;
}

export const FAMILIA_ELABORADO_REPOSITORY = Symbol('FAMILIA_ELABORADO_REPOSITORY');
