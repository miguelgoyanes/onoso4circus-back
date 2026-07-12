import { MediasPase, MediasPlaza, StockMedioPorPase, VisionGeneralAnual } from '../application/analisis-resumen.service';

export interface VisionGeneralAnualPublico {
  anio: number;
  facturacionTotal: string;
  facturacionTaquilla: string;
  facturacionBar: string;
  facturacionContratos: string;
  beneficioBruto: string;
  beneficioNeto: string;
  ticketMedioCliente: string;
  flujoCajaAnual: string;
  pendientePagoProveedores: { total: string; count: number };
  margenBarPct: string;
}

export interface MediasPlazaPublico {
  numeroPlazas: number;
  facturacionMediaTotal: string;
  facturacionMediaBar: string;
  facturacionMediaTaquilla: string;
  facturacionMediaContratos: string;
  beneficioMedio: string;
  beneficioMedioBar: string;
  margenBarMedioPct: string;
}

export interface MediasPasePublico {
  numeroPases: number;
  facturacionMediaPaseTotal: string;
  facturacionMediaPaseBar: string;
  facturacionMediaPaseTaquilla: string;
}

export interface StockMedioPorPaseItemPublico {
  productoId: string;
  productoNombre: string;
  imagenUrl: string | null;
  cantidadMediaPorPase: string;
}

export interface StockMedioPorPasePublico {
  numeroPases: number;
  unidadesMediasPorPase: string;
  porProducto: StockMedioPorPaseItemPublico[];
}

export function toVisionGeneralAnualPublico(v: VisionGeneralAnual): VisionGeneralAnualPublico {
  return {
    anio: v.anio,
    facturacionTotal: v.facturacionTotal.toString(),
    facturacionTaquilla: v.facturacionTaquilla.toString(),
    facturacionBar: v.facturacionBar.toString(),
    facturacionContratos: v.facturacionContratos.toString(),
    beneficioBruto: v.beneficioBruto.toString(),
    beneficioNeto: v.beneficioNeto.toString(),
    ticketMedioCliente: v.ticketMedioCliente.toString(),
    flujoCajaAnual: v.flujoCajaAnual.toString(),
    pendientePagoProveedores: {
      total: v.pendientePagoProveedores.total.toString(),
      count: v.pendientePagoProveedores.count,
    },
    margenBarPct: v.margenBarPct.toString(),
  };
}

export function toMediasPlazaPublico(m: MediasPlaza): MediasPlazaPublico {
  return {
    numeroPlazas: m.numeroPlazas,
    facturacionMediaTotal: m.facturacionMediaTotal.toString(),
    facturacionMediaBar: m.facturacionMediaBar.toString(),
    facturacionMediaTaquilla: m.facturacionMediaTaquilla.toString(),
    facturacionMediaContratos: m.facturacionMediaContratos.toString(),
    beneficioMedio: m.beneficioMedio.toString(),
    beneficioMedioBar: m.beneficioMedioBar.toString(),
    margenBarMedioPct: m.margenBarMedioPct.toString(),
  };
}

export function toMediasPasePublico(m: MediasPase): MediasPasePublico {
  return {
    numeroPases: m.numeroPases,
    facturacionMediaPaseTotal: m.facturacionMediaPaseTotal.toString(),
    facturacionMediaPaseBar: m.facturacionMediaPaseBar.toString(),
    facturacionMediaPaseTaquilla: m.facturacionMediaPaseTaquilla.toString(),
  };
}

export function toStockMedioPorPasePublico(s: StockMedioPorPase): StockMedioPorPasePublico {
  return {
    numeroPases: s.numeroPases,
    unidadesMediasPorPase: s.unidadesMediasPorPase.toString(),
    porProducto: s.porProducto.map((p) => ({
      productoId: p.productoId,
      productoNombre: p.productoNombre,
      imagenUrl: p.imagenUrl,
      cantidadMediaPorPase: p.cantidadMediaPorPase.toString(),
    })),
  };
}
