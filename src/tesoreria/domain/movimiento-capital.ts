import Decimal from 'decimal.js';
import { TipoMovimientoCapital } from './tipo-movimiento-capital';

export class MovimientoCapital {
  public readonly id: string;
  public readonly cuentaId: string;
  public readonly tipo: TipoMovimientoCapital;
  public readonly importe: Decimal;
  public readonly concepto?: string;
  public readonly journalEntryId: string;
  public readonly fecha: Date;

  constructor(params: {
    id: string;
    cuentaId: string;
    tipo: TipoMovimientoCapital;
    importe: Decimal;
    concepto?: string;
    journalEntryId: string;
    fecha: Date;
  }) {
    this.id = params.id;
    this.cuentaId = params.cuentaId;
    this.tipo = params.tipo;
    this.importe = params.importe;
    this.concepto = params.concepto;
    this.journalEntryId = params.journalEntryId;
    this.fecha = params.fecha;
  }

  public actualizado(params: {
    tipo: TipoMovimientoCapital;
    importe: Decimal;
    concepto?: string;
    journalEntryId: string;
  }): MovimientoCapital {
    return new MovimientoCapital({ ...this, ...params });
  }
}
