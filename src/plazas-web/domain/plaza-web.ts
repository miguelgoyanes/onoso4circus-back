import { TipoVenta } from './tipo-venta';

export class PlazaWeb {
  public readonly id: string;
  public readonly ciudad: string;
  public readonly ubicacion: string;
  public readonly mapsUrl: string;
  public readonly descripcion: string | null;
  public readonly cartelUrl: string | null;
  public readonly entradasUrl: string;
  public readonly venta: TipoVenta;
  public readonly horasAntes: number | null;
  // Enlace opcional a una Plaza contable ya existente (backend/src/plazas/) — nunca la
  // misma entidad, solo una referencia. La web pública funciona igual sin este enlace.
  public readonly plazaId: string | null;

  constructor(params: {
    id: string;
    ciudad: string;
    ubicacion: string;
    mapsUrl: string;
    descripcion?: string | null;
    cartelUrl?: string | null;
    entradasUrl: string;
    venta: TipoVenta;
    horasAntes?: number | null;
    plazaId?: string | null;
  }) {
    this.id = params.id;
    this.ciudad = params.ciudad;
    this.ubicacion = params.ubicacion;
    this.mapsUrl = params.mapsUrl;
    this.descripcion = params.descripcion ?? null;
    this.cartelUrl = params.cartelUrl ?? null;
    this.entradasUrl = params.entradasUrl;
    this.venta = params.venta;
    this.horasAntes = params.horasAntes ?? null;
    this.plazaId = params.plazaId ?? null;
  }

  public conDatos(params: {
    ciudad: string;
    ubicacion: string;
    mapsUrl: string;
    descripcion?: string | null;
    entradasUrl: string;
    venta: TipoVenta;
    horasAntes?: number | null;
    plazaId?: string | null;
  }): PlazaWeb {
    return new PlazaWeb({
      id: this.id,
      ciudad: params.ciudad,
      ubicacion: params.ubicacion,
      mapsUrl: params.mapsUrl,
      descripcion: params.descripcion ?? null,
      cartelUrl: this.cartelUrl,
      entradasUrl: params.entradasUrl,
      venta: params.venta,
      horasAntes: params.horasAntes ?? null,
      plazaId: params.plazaId ?? null,
    });
  }

  public conCartel(cartelUrl: string): PlazaWeb {
    return new PlazaWeb({
      id: this.id,
      ciudad: this.ciudad,
      ubicacion: this.ubicacion,
      mapsUrl: this.mapsUrl,
      descripcion: this.descripcion,
      cartelUrl,
      entradasUrl: this.entradasUrl,
      venta: this.venta,
      horasAntes: this.horasAntes,
      plazaId: this.plazaId,
    });
  }
}
