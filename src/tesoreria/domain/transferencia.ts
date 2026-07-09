import Decimal from 'decimal.js';

export class Transferencia {
  public readonly id: string;
  public readonly origenId: string;
  public readonly destinoId: string;
  public readonly importe: Decimal;
  public readonly concepto?: string;
  public readonly journalEntryId: string;
  public readonly fecha: Date;

  constructor(params: {
    id: string;
    origenId: string;
    destinoId: string;
    importe: Decimal;
    concepto?: string;
    journalEntryId: string;
    fecha: Date;
  }) {
    this.id = params.id;
    this.origenId = params.origenId;
    this.destinoId = params.destinoId;
    this.importe = params.importe;
    this.concepto = params.concepto;
    this.journalEntryId = params.journalEntryId;
    this.fecha = params.fecha;
  }

  public actualizada(params: {
    origenId: string;
    destinoId: string;
    importe: Decimal;
    concepto?: string;
    journalEntryId: string;
  }): Transferencia {
    return new Transferencia({ ...this, ...params });
  }
}
