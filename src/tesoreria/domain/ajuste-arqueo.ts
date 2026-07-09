import Decimal from 'decimal.js';

export class AjusteArqueo {
  public readonly id: string;
  public readonly cuentaId: string;
  public readonly importeTeorico: Decimal;
  public readonly importeReal: Decimal;
  public readonly diferencia: Decimal;
  // undefined cuando diferencia=0 — no hace falta postear ningún asiento.
  public readonly journalEntryId?: string;
  public readonly concepto?: string;
  public readonly fecha: Date;

  constructor(params: {
    id: string;
    cuentaId: string;
    importeTeorico: Decimal;
    importeReal: Decimal;
    diferencia: Decimal;
    journalEntryId?: string;
    concepto?: string;
    fecha: Date;
  }) {
    this.id = params.id;
    this.cuentaId = params.cuentaId;
    this.importeTeorico = params.importeTeorico;
    this.importeReal = params.importeReal;
    this.diferencia = params.diferencia;
    this.journalEntryId = params.journalEntryId;
    this.concepto = params.concepto;
    this.fecha = params.fecha;
  }

  // journalEntryId siempre debe pasarse explícitamente (aunque sea undefined) para que
  // sobrescriba correctamente el valor anterior — un spread con la clave omitida no lo haría.
  public actualizado(params: {
    importeTeorico: Decimal;
    importeReal: Decimal;
    diferencia: Decimal;
    journalEntryId: string | undefined;
    concepto?: string;
  }): AjusteArqueo {
    return new AjusteArqueo({ ...this, ...params });
  }
}
