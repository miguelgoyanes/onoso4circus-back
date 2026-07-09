import { RecepcionStock } from '../domain/recepcion-stock';
import { TipoFiscal } from '../domain/tipo-fiscal';

export interface RecepcionStockPublico {
  id: string;
  productoId: string;
  productoNombre: string;
  cantidad: number;
  costeUnitario: string;
  baseImponible: string;
  importeTotal: string;
  fecha: string;
  cuentaOrigenId: string;
  plazaId?: string;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: string;
  importeIva?: string;
}

export function toRecepcionStockPublico(recepcion: RecepcionStock, productoNombre: string): RecepcionStockPublico {
  return {
    id: recepcion.id,
    productoId: recepcion.productoId,
    productoNombre,
    cantidad: recepcion.cantidad,
    costeUnitario: recepcion.costeUnitario.toString(),
    baseImponible: recepcion.baseImponible.toString(),
    importeTotal: recepcion.importeTotal.toString(),
    fecha: recepcion.fecha.toISOString(),
    cuentaOrigenId: recepcion.cuentaOrigenId,
    plazaId: recepcion.plazaId,
    tipoFiscal: recepcion.tipoFiscal,
    ivaPercent: recepcion.ivaPercent?.toString(),
    importeIva: recepcion.importeIva?.toString(),
  };
}
