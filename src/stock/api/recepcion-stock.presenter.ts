import { RecepcionStock } from '../domain/recepcion-stock';
import { TipoFiscal } from '../domain/tipo-fiscal';
import { UnidadMedida } from '../domain/unidad-medida';
import { EstadoPagoRecepcion } from '../domain/estado-pago-recepcion';

// Estado de un lote de INSUMO, derivado (nunca almacenado) comparando fechaInicioUso entre
// los lotes de un mismo insumo — ver RecepcionesStockController.presentar.
export type EstadoLote = 'POR_CONSUMIR' | 'CONSUMIENDO' | 'CONSUMIDO';

export interface RecepcionStockPublico {
  id: string;
  productoId: string;
  productoNombre: string;
  cantidad: number;
  costeUnitario: string;
  baseImponible: string;
  importeTotal: string;
  fecha: string;
  cuentaOrigenId?: string;
  estadoPago: EstadoPagoRecepcion;
  plazaId?: string;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: string;
  importeIva?: string;
  cantidadMedida?: string;
  unidadMedida?: UnidadMedida;
  fechaInicioUso?: string;
  estadoLote?: EstadoLote;
  // true si ya se asentó su asiento de cierre — historia asentada, no editable ni eliminable
  // (ver RecepcionStockService.validarNoCerrado). Distinto de estadoLote===CONSUMIDO: un lote
  // puede quedar CONSUMIDO sin haberse cerrado con asiento si no tuvo ninguna venta que
  // reconocer, y ese sí se puede seguir editando/eliminando.
  cerrado: boolean;
}

export function toRecepcionStockPublico(
  recepcion: RecepcionStock,
  productoNombre: string,
  esLoteActivo?: boolean,
): RecepcionStockPublico {
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
    estadoPago: recepcion.estadoPago,
    plazaId: recepcion.plazaId,
    tipoFiscal: recepcion.tipoFiscal,
    ivaPercent: recepcion.ivaPercent?.toString(),
    importeIva: recepcion.importeIva?.toString(),
    cantidadMedida: recepcion.cantidadMedida?.toString(),
    unidadMedida: recepcion.unidadMedida,
    fechaInicioUso: recepcion.fechaInicioUso?.toISOString(),
    estadoLote:
      recepcion.fechaInicioUso == null ? 'POR_CONSUMIR' : esLoteActivo ? 'CONSUMIENDO' : 'CONSUMIDO',
    cerrado: recepcion.cierreJournalEntryId != null,
  };
}
