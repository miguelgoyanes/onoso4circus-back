import Decimal from 'decimal.js';
import { TipoFiscal } from './tipo-fiscal';

export class RecepcionStock {
  public readonly id: string;
  public readonly productoId: string;
  public readonly cantidad: number;
  // Siempre la base por unidad (sin IVA) — es lo que se usa para valorar el inventario
  // (Producto.costeUnitarioActual), coherente con que el IVA soportado es recuperable
  // y no forma parte del coste real de la mercancía.
  public readonly costeUnitario: Decimal;
  public readonly baseImponible: Decimal;
  public readonly importeTotal: Decimal;
  // Fecha Y HORA completas, siempre editables por el usuario (por defecto "ahora" al
  // crear). Es el único campo de fecha — determina tanto lo que se muestra como el orden
  // real del historial de stock, para que Brandon pueda situar a mano una recepción
  // antigua exactamente entre las salidas que correspondan.
  public readonly fecha: Date;
  public readonly cuentaOrigenId: string;
  public readonly journalEntryId: string;
  public readonly plazaId?: string;
  public readonly tipoFiscal?: TipoFiscal;
  public readonly ivaPercent?: Decimal;
  public readonly importeIva?: Decimal;

  constructor(params: {
    id: string;
    productoId: string;
    cantidad: number;
    costeUnitario: Decimal;
    baseImponible: Decimal;
    importeTotal: Decimal;
    fecha: Date;
    cuentaOrigenId: string;
    journalEntryId: string;
    plazaId?: string;
    tipoFiscal?: TipoFiscal;
    ivaPercent?: Decimal;
    importeIva?: Decimal;
  }) {
    this.id = params.id;
    this.productoId = params.productoId;
    this.cantidad = params.cantidad;
    this.costeUnitario = params.costeUnitario;
    this.baseImponible = params.baseImponible;
    this.importeTotal = params.importeTotal;
    this.fecha = params.fecha;
    this.cuentaOrigenId = params.cuentaOrigenId;
    this.journalEntryId = params.journalEntryId;
    this.plazaId = params.plazaId;
    this.tipoFiscal = params.tipoFiscal;
    this.ivaPercent = params.ivaPercent;
    this.importeIva = params.importeIva;
  }
}
