import { MovimientoCuenta } from '../../accounting/application/journal-entry.repository';

export interface MovimientoCuentaPublico {
  journalEntryId: string;
  fecha: string;
  descripcion: string;
  // Con signo: positivo si aumentó el saldo, negativo si lo redujo — las cuentas de dinero
  // siempre son ASSET, así que debit-credit ya da el signo correcto sin mirar el tipo.
  importe: string;
}

export function toMovimientoCuentaPublico(movimiento: MovimientoCuenta): MovimientoCuentaPublico {
  return {
    journalEntryId: movimiento.journalEntryId,
    fecha: movimiento.fecha.toISOString(),
    descripcion: movimiento.descripcion,
    importe: movimiento.debit.minus(movimiento.credit).toString(),
  };
}
