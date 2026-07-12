import Decimal from 'decimal.js';
import { TipoFiscal } from './tipo-fiscal';
import { UnidadMedida } from './unidad-medida';
import { EstadoPagoRecepcion } from './estado-pago-recepcion';

export class RecepcionStock {
  public readonly id: string;
  public readonly productoId: string;
  // Para un INSUMO, esto es siempre 1 (un lote/saco entero) — costeUnitario es entonces el
  // coste total del lote. La cantidad física real (kg, litros...) va en cantidadMedida, que
  // es meramente informativa y nunca entra en ningún cálculo de coste.
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
  // Solo obligatoria cuando estadoPago = PAGADO — mientras está pendiente de pago no hay
  // todavía una cuenta de tesorería real que crediticiar (se abona a "Proveedores de stock").
  public readonly cuentaOrigenId?: string;
  public readonly estadoPago: EstadoPagoRecepcion;
  public readonly journalEntryId: string;
  // Id del asiento que liquida "Proveedores de stock" contra la cuenta real, si esta
  // recepción se creó/editó como PENDIENTE_PAGO y luego se pagó (ver
  // RecepcionStockService.pagarPendiente). Null mientras sigue pendiente o si nunca lo estuvo.
  public readonly pagoJournalEntryId?: string | null;
  public readonly plazaId?: string;
  public readonly tipoFiscal?: TipoFiscal;
  public readonly ivaPercent?: Decimal;
  public readonly importeIva?: Decimal;
  // Solo para INSUMO — cantidad física comprada (ej. 15) puramente informativa, para poder
  // sacar analíticas de consumo más adelante ("cuántos kg de maíz llevo gastados").
  public readonly cantidadMedida?: Decimal;
  public readonly unidadMedida?: UnidadMedida;
  // Solo para INSUMO — cuándo se empezó a usar de verdad este lote concreto (distinto de
  // `fecha`, que es cuándo se compró/facturó). Null mientras el lote está "por consumir".
  // Al fijarse, el lote anterior del mismo insumo se considera agotado en ese instante — es
  // la única acción manual de todo el flujo de coste de un producto ELABORADO.
  public readonly fechaInicioUso?: Date | null;
  // Solo para INSUMO — id del asiento que reconoce EXACTAMENTE el coste de este lote como
  // "coste de producto vendido" al cerrarlo (abrir el siguiente). Null mientras sigue activo,
  // y también si se cerró sin ninguna venta que atribuirle (nada que reconocer) — por eso NO
  // sirve por sí solo para saber si el lote ya se cerró, ver `cerrado`.
  public readonly cierreJournalEntryId?: string | null;
  // Solo para INSUMO — true en cuanto CosteElaboradoService.cerrarLote lo procesa una vez,
  // tenga o no algo que reconocer. Evita cerrarlo dos veces si se borra el lote siguiente (el
  // que lo cerró) y loteActivo() volvería a "encontrarlo" por tener el fechaInicioUso más
  // reciente que queda en pie — ver RecepcionStockService.loteActivo.
  public readonly cerrado?: boolean;

  constructor(params: {
    id: string;
    productoId: string;
    cantidad: number;
    costeUnitario: Decimal;
    baseImponible: Decimal;
    importeTotal: Decimal;
    fecha: Date;
    cuentaOrigenId?: string;
    estadoPago?: EstadoPagoRecepcion;
    journalEntryId: string;
    pagoJournalEntryId?: string | null;
    plazaId?: string;
    tipoFiscal?: TipoFiscal;
    ivaPercent?: Decimal;
    importeIva?: Decimal;
    cantidadMedida?: Decimal;
    unidadMedida?: UnidadMedida;
    fechaInicioUso?: Date | null;
    cierreJournalEntryId?: string | null;
    cerrado?: boolean;
  }) {
    this.id = params.id;
    this.productoId = params.productoId;
    this.cantidad = params.cantidad;
    this.costeUnitario = params.costeUnitario;
    this.baseImponible = params.baseImponible;
    this.importeTotal = params.importeTotal;
    this.fecha = params.fecha;
    this.cuentaOrigenId = params.cuentaOrigenId;
    this.estadoPago = params.estadoPago ?? EstadoPagoRecepcion.PAGADO;
    this.journalEntryId = params.journalEntryId;
    this.pagoJournalEntryId = params.pagoJournalEntryId;
    this.plazaId = params.plazaId;
    this.tipoFiscal = params.tipoFiscal;
    this.ivaPercent = params.ivaPercent;
    this.importeIva = params.importeIva;
    this.cantidadMedida = params.cantidadMedida;
    this.unidadMedida = params.unidadMedida;
    this.fechaInicioUso = params.fechaInicioUso;
    this.cierreJournalEntryId = params.cierreJournalEntryId;
    this.cerrado = params.cerrado ?? false;
  }

  public conFechaInicioUso(fechaInicioUso: Date): RecepcionStock {
    return new RecepcionStock({ ...this, fechaInicioUso });
  }

  public conPago(cuentaOrigenId: string, pagoJournalEntryId: string): RecepcionStock {
    return new RecepcionStock({
      ...this,
      cuentaOrigenId,
      estadoPago: EstadoPagoRecepcion.PAGADO,
      pagoJournalEntryId,
    });
  }

  // cierreJournalEntryId puede quedar null (lote cerrado sin nada que reconocer) — `cerrado`
  // siempre pasa a true aquí, sea cual sea el resultado, para que no se vuelva a procesar.
  public conCierre(cierreJournalEntryId: string | null): RecepcionStock {
    return new RecepcionStock({ ...this, cierreJournalEntryId, cerrado: true });
  }
}
