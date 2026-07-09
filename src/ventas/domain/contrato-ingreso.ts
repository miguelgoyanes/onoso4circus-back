import Decimal from 'decimal.js';
import { EstadoCobro } from './estado-cobro';
import { TipoFiscal } from './tipo-fiscal';

export class ContratoIngreso {
  public readonly id: string;
  public readonly cliente: string;
  public readonly concepto: string;
  public readonly importe: Decimal;
  public readonly fecha: Date;
  public readonly plazaId?: string;
  public readonly fechaId?: string;
  public readonly paseId?: string;
  public readonly estadoCobro: EstadoCobro;
  public readonly cuentaDestinoId?: string;
  public readonly tipoFiscal?: TipoFiscal;
  public readonly ivaPercent?: Decimal;
  public readonly baseImponible?: Decimal;
  public readonly importeIva?: Decimal;
  // Todos los JournalEntry generados por este contrato (el de creación, y el de cobro si
  // pasó por cobrar() estando pendiente) — hacen falta para poder deshacerlos íntegramente
  // al eliminar.
  public readonly journalEntryIds: string[];

  constructor(params: {
    id: string;
    cliente: string;
    concepto: string;
    importe: Decimal;
    fecha: Date;
    estadoCobro: EstadoCobro;
    plazaId?: string;
    fechaId?: string;
    paseId?: string;
    cuentaDestinoId?: string;
    tipoFiscal?: TipoFiscal;
    ivaPercent?: Decimal;
    baseImponible?: Decimal;
    importeIva?: Decimal;
    journalEntryIds?: string[];
  }) {
    this.id = params.id;
    this.cliente = params.cliente;
    this.concepto = params.concepto;
    this.importe = params.importe;
    this.fecha = params.fecha;
    this.estadoCobro = params.estadoCobro;
    this.plazaId = params.plazaId;
    this.fechaId = params.fechaId;
    this.paseId = params.paseId;
    this.cuentaDestinoId = params.cuentaDestinoId;
    this.tipoFiscal = params.tipoFiscal;
    this.ivaPercent = params.ivaPercent;
    this.baseImponible = params.baseImponible;
    this.importeIva = params.importeIva;
    this.journalEntryIds = params.journalEntryIds ?? [];
  }

  public cobrado(cuentaDestinoId: string, nuevoJournalEntryId: string): ContratoIngreso {
    return new ContratoIngreso({
      ...this,
      estadoCobro: EstadoCobro.COBRADO,
      cuentaDestinoId,
      journalEntryIds: [...this.journalEntryIds, nuevoJournalEntryId],
    });
  }

  // estadoCobro, cuentaDestinoId y plazaId/fechaId/paseId no se tocan aquí — la corrección
  // solo cubre los datos "de factura"; cambiar el estado de cobro sigue yendo por cobrado().
  public actualizado(params: {
    cliente: string;
    concepto: string;
    importe: Decimal;
    fecha: Date;
    tipoFiscal?: TipoFiscal;
    ivaPercent?: Decimal;
    baseImponible?: Decimal;
    importeIva?: Decimal;
    journalEntryIds: string[];
  }): ContratoIngreso {
    return new ContratoIngreso({
      ...this,
      cliente: params.cliente,
      concepto: params.concepto,
      importe: params.importe,
      fecha: params.fecha,
      tipoFiscal: params.tipoFiscal,
      ivaPercent: params.ivaPercent,
      baseImponible: params.baseImponible,
      importeIva: params.importeIva,
      journalEntryIds: params.journalEntryIds,
    });
  }
}
