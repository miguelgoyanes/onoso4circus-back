import { Transferencia } from '../domain/transferencia';

export interface TransferenciaPublica {
  id: string;
  origenId: string;
  destinoId: string;
  importe: string;
  concepto?: string;
  fecha: string;
}

export function toTransferenciaPublica(transferencia: Transferencia): TransferenciaPublica {
  return {
    id: transferencia.id,
    origenId: transferencia.origenId,
    destinoId: transferencia.destinoId,
    importe: transferencia.importe.toString(),
    concepto: transferencia.concepto,
    fecha: transferencia.fecha.toISOString(),
  };
}
