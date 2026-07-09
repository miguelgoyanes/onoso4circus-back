import { VentaBar, VentaBarLinea } from '../domain/venta-bar';
import { TipoFiscal } from '../domain/tipo-fiscal';

export interface VentaBarLineaPublica {
  productoId: string;
  cantidad: number;
  precioUnitarioAplicado: string;
  costeUnitarioAplicado: string;
}

export interface VentaBarPublica {
  id: string;
  paseId: string;
  fechaId: string;
  plazaId: string;
  cuentaCobroId: string;
  lineas: VentaBarLineaPublica[];
  importeTotal: string;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: string;
  baseImponible?: string;
  importeIva?: string;
}

function toLineaPublica(linea: VentaBarLinea): VentaBarLineaPublica {
  return {
    productoId: linea.productoId,
    cantidad: linea.cantidad,
    precioUnitarioAplicado: linea.precioUnitarioAplicado.toString(),
    costeUnitarioAplicado: linea.costeUnitarioAplicado.toString(),
  };
}

export function toVentaBarPublica(venta: VentaBar): VentaBarPublica {
  return {
    id: venta.id,
    paseId: venta.paseId,
    fechaId: venta.fechaId,
    plazaId: venta.plazaId,
    cuentaCobroId: venta.cuentaCobroId,
    lineas: venta.lineas.map(toLineaPublica),
    importeTotal: venta.importeTotal.toString(),
    tipoFiscal: venta.tipoFiscal,
    ivaPercent: venta.ivaPercent?.toString(),
    baseImponible: venta.baseImponible?.toString(),
    importeIva: venta.importeIva?.toString(),
  };
}
