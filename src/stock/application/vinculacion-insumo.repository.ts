import { VinculacionInsumo } from '../domain/vinculacion-insumo';

export interface VinculacionInsumoRepository {
  save(vinculacion: VinculacionInsumo): Promise<void>;
  findById(id: string): Promise<VinculacionInsumo | null>;
  findByFamilia(familiaElaboradoId: string): Promise<VinculacionInsumo[]>;
  findByInsumo(insumoId: string): Promise<VinculacionInsumo | null>;
  existeConInsumo(insumoId: string): Promise<boolean>;
  delete(id: string): Promise<void>;
}

export const VINCULACION_INSUMO_REPOSITORY = Symbol('VINCULACION_INSUMO_REPOSITORY');
