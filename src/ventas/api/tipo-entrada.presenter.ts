import { TipoEntrada } from '../domain/tipo-entrada';

export interface TipoEntradaPublico {
  id: string;
  nombre: string;
  precio: string;
  aplicaIva: boolean;
  color: string | null;
  orden: number;
  activo: boolean;
  usado: boolean;
}

export function toTipoEntradaPublico(tipoEntrada: TipoEntrada, usado: boolean): TipoEntradaPublico {
  return {
    id: tipoEntrada.id,
    nombre: tipoEntrada.nombre,
    precio: tipoEntrada.precio.toString(),
    aplicaIva: tipoEntrada.aplicaIva,
    color: tipoEntrada.color,
    orden: tipoEntrada.orden,
    activo: tipoEntrada.activo,
    usado,
  };
}
