import { MovimientoCapital } from '../domain/movimiento-capital';
import { TipoMovimientoCapital } from '../domain/tipo-movimiento-capital';

export interface MovimientoCapitalPublico {
  id: string;
  cuentaId: string;
  tipo: TipoMovimientoCapital;
  importe: string;
  concepto?: string;
  fecha: string;
}

export function toMovimientoCapitalPublico(movimiento: MovimientoCapital): MovimientoCapitalPublico {
  return {
    id: movimiento.id,
    cuentaId: movimiento.cuentaId,
    tipo: movimiento.tipo,
    importe: movimiento.importe.toString(),
    concepto: movimiento.concepto,
    fecha: movimiento.fecha.toISOString(),
  };
}
