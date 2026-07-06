import { Fecha } from '../domain/fecha';

export interface FechaPublica {
  id: string;
  plazaId: string;
  fecha: string;
  tipoActividad: string;
}

export function toFechaPublica(fecha: Fecha): FechaPublica {
  return {
    id: fecha.id,
    plazaId: fecha.plazaId,
    fecha: fecha.fecha.toISOString().slice(0, 10),
    tipoActividad: fecha.tipoActividad,
  };
}
