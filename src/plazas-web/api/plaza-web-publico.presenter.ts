import { PlazaWeb } from '../domain/plaza-web';
import { FuncionWeb } from '../domain/funcion-web';
import { TipoVenta } from '../domain/tipo-venta';

// Shape público que consume circusnova.es (frontend/src/data/tourDates.fallback.json
// original) — se mantiene tal cual para no tener que tocar el frontend público más de lo
// necesario: mismos nombres de campo, "venta" en minúsculas, "oferta" ausente (no null)
// cuando no hay descuento.
export interface OfertaPublicaWeb {
  descuento: number;
  descripcion?: string;
}

export interface FuncionPublicaWeb {
  fecha: string;
  horarios: string[];
  oferta?: OfertaPublicaWeb;
}

export interface PlazaPublicaWeb {
  id: string;
  ciudad: string;
  ubicacion: string;
  mapsUrl: string;
  descripcion: string | null;
  cartel: string | null;
  entradasUrl: string;
  venta: 'online' | 'presencial' | 'ambos';
  horasAntes: number | null;
  funciones: FuncionPublicaWeb[];
}

const VENTA_A_TEXTO: Record<TipoVenta, 'online' | 'presencial' | 'ambos'> = {
  [TipoVenta.ONLINE]: 'online',
  [TipoVenta.PRESENCIAL]: 'presencial',
  [TipoVenta.AMBOS]: 'ambos',
};

function toFuncionPublicaWeb(funcion: FuncionWeb): FuncionPublicaWeb {
  const publica: FuncionPublicaWeb = {
    fecha: funcion.fecha.toISOString().slice(0, 10),
    horarios: funcion.horarios,
  };
  if (funcion.descuento !== null) {
    publica.oferta = { descuento: funcion.descuento, descripcion: funcion.descuentoDescripcion ?? undefined };
  }
  return publica;
}

// baseUrl (protocolo+host de la petición entrante) porque el cartel ahora lo sirve este
// backend, no la propia web — antes era una ruta relativa servida por el mismo origen.
export function toPlazaPublicaWeb(plazaWeb: PlazaWeb, funciones: FuncionWeb[], baseUrl: string): PlazaPublicaWeb {
  return {
    id: plazaWeb.id,
    ciudad: plazaWeb.ciudad,
    ubicacion: plazaWeb.ubicacion,
    mapsUrl: plazaWeb.mapsUrl,
    descripcion: plazaWeb.descripcion,
    cartel: plazaWeb.cartelUrl ? `${baseUrl}${plazaWeb.cartelUrl}` : null,
    entradasUrl: plazaWeb.entradasUrl,
    venta: VENTA_A_TEXTO[plazaWeb.venta],
    horasAntes: plazaWeb.horasAntes,
    funciones: funciones.map(toFuncionPublicaWeb),
  };
}
