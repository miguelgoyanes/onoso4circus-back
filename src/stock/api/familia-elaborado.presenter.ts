import { FamiliaElaborado } from '../domain/familia-elaborado';
import { VinculacionInsumo } from '../domain/vinculacion-insumo';

export interface FamiliaElaboradoPublica {
  id: string;
  nombre: string;
}

export function toFamiliaElaboradoPublica(familia: FamiliaElaborado): FamiliaElaboradoPublica {
  return { id: familia.id, nombre: familia.nombre };
}

export interface VinculacionInsumoPublica {
  id: string;
  insumoId: string;
  insumoNombre: string;
  familiaElaboradoId: string;
}

export function toVinculacionInsumoPublica(
  vinculacion: VinculacionInsumo,
  insumoNombre: string,
): VinculacionInsumoPublica {
  return {
    id: vinculacion.id,
    insumoId: vinculacion.insumoId,
    insumoNombre,
    familiaElaboradoId: vinculacion.familiaElaboradoId,
  };
}
