import { MovimientoCuentaConOrigen } from '../application/cuenta-dinero.service';

export interface MovimientoCuentaPublico {
  journalEntryId: string;
  fecha: string;
  descripcion: string;
  // Con signo: positivo si aumentó el saldo, negativo si lo redujo — las cuentas de dinero
  // siempre son ASSET, así que debit-credit ya da el signo correcto sin mirar el tipo.
  importe: string;
  // null cuando el movimiento viene de Ventas/Gastos/Contratos/Stock — no editable desde aquí.
  origenTipo: 'TRANSFERENCIA' | 'CAPITAL' | 'AJUSTE_ARQUEO' | null;
  origenId: string | null;
}

export function toMovimientoCuentaPublico(movimiento: MovimientoCuentaConOrigen): MovimientoCuentaPublico {
  return {
    journalEntryId: movimiento.journalEntryId,
    fecha: movimiento.fecha.toISOString(),
    descripcion: movimiento.descripcion,
    importe: movimiento.debit.minus(movimiento.credit).toString(),
    origenTipo: movimiento.origenTipo,
    origenId: movimiento.origenId,
  };
}
