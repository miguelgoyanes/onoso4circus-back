import Decimal from 'decimal.js';
import { TipoAjusteStock } from './tipo-ajuste-stock';

export class AjusteStock {
  constructor(
    public readonly id: string,
    public readonly productoId: string,
    public readonly tipo: TipoAjusteStock,
    public readonly cantidad: number,
    public readonly costeUnitarioAplicado: Decimal,
    public readonly journalEntryId: string,
    // Fecha y hora completas, editables (por defecto "ahora" al crear) — igual que en
    // RecepcionStock, es el único campo de fecha y el que determina el orden real del
    // historial de stock.
    public readonly fecha: Date,
    public readonly plazaId?: string,
    public readonly fechaId?: string,
    public readonly paseId?: string,
  ) {}
}
