import { Plaza } from '../domain/plaza';
import { TipoPlaza } from '../domain/tipo-plaza';

export interface PlazaPublica {
  id: string;
  nombre: string;
  ubicacion: string;
  tipoPlaza: TipoPlaza;
}

export function toPlazaPublica(plaza: Plaza): PlazaPublica {
  return {
    id: plaza.id,
    nombre: plaza.nombre,
    ubicacion: plaza.ubicacion,
    tipoPlaza: plaza.tipoPlaza,
  };
}
