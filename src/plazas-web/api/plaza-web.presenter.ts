import { PlazaWeb } from '../domain/plaza-web';
import { TipoVenta } from '../domain/tipo-venta';

export interface PlazaWebPublica {
  id: string;
  ciudad: string;
  ubicacion: string;
  mapsUrl: string;
  descripcion: string | null;
  cartelUrl: string | null;
  entradasUrl: string;
  venta: TipoVenta;
  horasAntes: number | null;
  plazaId: string | null;
}

export function toPlazaWebPublica(plazaWeb: PlazaWeb): PlazaWebPublica {
  return {
    id: plazaWeb.id,
    ciudad: plazaWeb.ciudad,
    ubicacion: plazaWeb.ubicacion,
    mapsUrl: plazaWeb.mapsUrl,
    descripcion: plazaWeb.descripcion,
    cartelUrl: plazaWeb.cartelUrl,
    entradasUrl: plazaWeb.entradasUrl,
    venta: plazaWeb.venta,
    horasAntes: plazaWeb.horasAntes,
    plazaId: plazaWeb.plazaId,
  };
}
