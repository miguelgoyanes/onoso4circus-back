import Decimal from 'decimal.js';
import { OrigenVenta } from './origen-venta';
import { TipoFiscal } from './tipo-fiscal';

export class VentaEntradas {
  public readonly id: string;
  public readonly paseId: string;
  // Denormalizados desde el pase al crear (paseId -> fechaId -> plazaId), inmutables — igual
  // que paseId, no se tocan en actualizada(). Permiten filtrar/agregar por fecha o plaza sin
  // hacer join contra Pase/Fecha en cada consulta.
  public readonly fechaId: string;
  public readonly plazaId: string;
  public readonly tipoEntradaId: string;
  public readonly cantidad: number;
  // Snapshot de TipoEntrada.precio en el momento de vender — el total de la línea
  // (cantidad × precioUnitarioAplicado) es siempre el importe real cobrado, tanto si aplica
  // IVA como si no: cuando tipoFiscal = A, baseImponible/importeIva se derivan de ese total
  // hacia atrás (nunca al revés), para que el total cobrado no cambie según la clasificación
  // fiscal.
  public readonly precioUnitarioAplicado: Decimal;
  public readonly cuentaCobroId: string;
  public readonly origen: OrigenVenta;
  public readonly numeroEntradaDesde?: string;
  public readonly numeroEntradaHasta?: string;
  public readonly tipoFiscal?: TipoFiscal;
  public readonly ivaPercent?: Decimal;
  public readonly baseImponible?: Decimal;
  public readonly importeIva?: Decimal;
  public readonly journalEntryId: string;

  constructor(params: {
    id: string;
    paseId: string;
    fechaId: string;
    plazaId: string;
    tipoEntradaId: string;
    cantidad: number;
    precioUnitarioAplicado: Decimal;
    cuentaCobroId: string;
    origen: OrigenVenta;
    numeroEntradaDesde?: string;
    numeroEntradaHasta?: string;
    tipoFiscal?: TipoFiscal;
    ivaPercent?: Decimal;
    baseImponible?: Decimal;
    importeIva?: Decimal;
    journalEntryId: string;
  }) {
    this.id = params.id;
    this.paseId = params.paseId;
    this.fechaId = params.fechaId;
    this.plazaId = params.plazaId;
    this.tipoEntradaId = params.tipoEntradaId;
    this.cantidad = params.cantidad;
    this.precioUnitarioAplicado = params.precioUnitarioAplicado;
    this.cuentaCobroId = params.cuentaCobroId;
    this.origen = params.origen;
    this.numeroEntradaDesde = params.numeroEntradaDesde;
    this.numeroEntradaHasta = params.numeroEntradaHasta;
    this.tipoFiscal = params.tipoFiscal;
    this.ivaPercent = params.ivaPercent;
    this.baseImponible = params.baseImponible;
    this.importeIva = params.importeIva;
    this.journalEntryId = params.journalEntryId;
  }

  // paseId/fechaId/plazaId no se tocan aquí — si hay que mover una venta de pase, se elimina
  // y se vuelve a registrar (ver plan de Fase 2).
  public actualizada(params: {
    tipoEntradaId: string;
    cantidad: number;
    precioUnitarioAplicado: Decimal;
    cuentaCobroId: string;
    origen: OrigenVenta;
    numeroEntradaDesde?: string;
    numeroEntradaHasta?: string;
    tipoFiscal?: TipoFiscal;
    ivaPercent?: Decimal;
    baseImponible?: Decimal;
    importeIva?: Decimal;
    journalEntryId: string;
  }): VentaEntradas {
    return new VentaEntradas({ ...this, ...params });
  }
}
