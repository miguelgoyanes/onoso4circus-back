import { Plaza } from '../domain/plaza';

export interface PlazaPublica {
  id: string;
  nombre: string;
  ubicacion: string;
}

export function toPlazaPublica(plaza: Plaza): PlazaPublica {
  return { id: plaza.id, nombre: plaza.nombre, ubicacion: plaza.ubicacion };
}
