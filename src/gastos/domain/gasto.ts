import Decimal from 'decimal.js';
import { ConceptoPersonal } from './concepto-personal';
import { TipoFiscal } from './tipo-fiscal';

export enum EstadoPagoGasto {
  PAGADO = 'PAGADO',
  PENDIENTE_PAGO = 'PENDIENTE_PAGO',
}

export class GastoPersonalDetalle {
  constructor(
    public readonly concepto: ConceptoPersonal,
    public readonly importe: Decimal,
  ) {}
}

export class Gasto {
  public readonly id: string;
  public readonly categoriaId: string;
  public readonly fecha: Date;
  public readonly descripcion: string;
  public readonly importe: Decimal;
  public readonly plazaId?: string;
  public readonly fechaId?: string;
  public readonly paseId?: string;
  public readonly empleadoId?: string;
  public readonly estadoPago: EstadoPagoGasto;
  public readonly cuentaPagoId?: string;
  // Reparto fiscal: representa SIEMPRE un único split por gasto, sea el importe entero
  // (categoría normal con aplica_iva) o específicamente la línea SALARIO (personal + AUTONOMO).
  public readonly tipoFiscal?: TipoFiscal;
  public readonly ivaPercent?: Decimal;
  public readonly baseImponible?: Decimal;
  public readonly importeIva?: Decimal;
  public readonly detalle: GastoPersonalDetalle[];
  // Todos los JournalEntry generados por este gasto (el de creación, y el de liquidación si
  // pasó por pagarPendiente) — se necesitan para poder deshacerlos íntegramente al eliminar.
  public readonly journalEntryIds: string[];

  constructor(params: {
    id: string;
    categoriaId: string;
    fecha: Date;
    descripcion: string;
    importe: Decimal;
    estadoPago: EstadoPagoGasto;
    plazaId?: string;
    fechaId?: string;
    paseId?: string;
    empleadoId?: string;
    cuentaPagoId?: string;
    tipoFiscal?: TipoFiscal;
    ivaPercent?: Decimal;
    baseImponible?: Decimal;
    importeIva?: Decimal;
    detalle?: GastoPersonalDetalle[];
    journalEntryIds?: string[];
  }) {
    this.id = params.id;
    this.categoriaId = params.categoriaId;
    this.fecha = params.fecha;
    this.descripcion = params.descripcion;
    this.importe = params.importe;
    this.estadoPago = params.estadoPago;
    this.plazaId = params.plazaId;
    this.fechaId = params.fechaId;
    this.paseId = params.paseId;
    this.empleadoId = params.empleadoId;
    this.cuentaPagoId = params.cuentaPagoId;
    this.tipoFiscal = params.tipoFiscal;
    this.ivaPercent = params.ivaPercent;
    this.baseImponible = params.baseImponible;
    this.importeIva = params.importeIva;
    this.detalle = params.detalle ?? [];
    this.journalEntryIds = params.journalEntryIds ?? [];
  }

  public marcarComoPagado(nuevoJournalEntryId: string): Gasto {
    return new Gasto({
      ...this,
      estadoPago: EstadoPagoGasto.PAGADO,
      journalEntryIds: [...this.journalEntryIds, nuevoJournalEntryId],
    });
  }
}
