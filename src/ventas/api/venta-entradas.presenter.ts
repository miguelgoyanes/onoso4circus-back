import { VentaEntradas } from '../domain/venta-entradas';
import { OrigenVenta } from '../domain/origen-venta';
import { TipoFiscal } from '../domain/tipo-fiscal';

export interface VentaEntradasPublica {
  id: string;
  paseId: string;
  fechaId: string;
  plazaId: string;
  tipoEntradaId: string;
  cantidad: number;
  precioUnitarioAplicado: string;
  cuentaCobroId: string;
  origen: OrigenVenta;
  numeroEntradaDesde?: string;
  numeroEntradaHasta?: string;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: string;
  baseImponible?: string;
  importeIva?: string;
}

export function toVentaEntradasPublica(venta: VentaEntradas): VentaEntradasPublica {
  return {
    id: venta.id,
    paseId: venta.paseId,
    fechaId: venta.fechaId,
    plazaId: venta.plazaId,
    tipoEntradaId: venta.tipoEntradaId,
    cantidad: venta.cantidad,
    precioUnitarioAplicado: venta.precioUnitarioAplicado.toString(),
    cuentaCobroId: venta.cuentaCobroId,
    origen: venta.origen,
    numeroEntradaDesde: venta.numeroEntradaDesde,
    numeroEntradaHasta: venta.numeroEntradaHasta,
    tipoFiscal: venta.tipoFiscal,
    ivaPercent: venta.ivaPercent?.toString(),
    baseImponible: venta.baseImponible?.toString(),
    importeIva: venta.importeIva?.toString(),
  };
}
