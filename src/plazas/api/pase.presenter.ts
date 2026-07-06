import { Pase } from '../domain/pase';

export interface PasePublico {
  id: string;
  fechaId: string;
  hora: string;
  nombre?: string;
}

export function toPasePublico(pase: Pase): PasePublico {
  return { id: pase.id, fechaId: pase.fechaId, hora: pase.hora, nombre: pase.nombre };
}
