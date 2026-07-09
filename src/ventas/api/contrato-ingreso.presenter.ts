import { ContratoIngreso } from '../domain/contrato-ingreso';
import { EstadoCobro } from '../domain/estado-cobro';
import { TipoFiscal } from '../domain/tipo-fiscal';

export interface ContratoIngresoPublico {
  id: string;
  cliente: string;
  concepto: string;
  importe: string;
  fecha: string;
  plazaId?: string;
  fechaId?: string;
  paseId?: string;
  estadoCobro: EstadoCobro;
  cuentaDestinoId?: string;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: string;
  baseImponible?: string;
  importeIva?: string;
}

export function toContratoIngresoPublico(contrato: ContratoIngreso): ContratoIngresoPublico {
  return {
    id: contrato.id,
    cliente: contrato.cliente,
    concepto: contrato.concepto,
    importe: contrato.importe.toString(),
    fecha: contrato.fecha.toISOString().slice(0, 10),
    plazaId: contrato.plazaId,
    fechaId: contrato.fechaId,
    paseId: contrato.paseId,
    estadoCobro: contrato.estadoCobro,
    cuentaDestinoId: contrato.cuentaDestinoId,
    tipoFiscal: contrato.tipoFiscal,
    ivaPercent: contrato.ivaPercent?.toString(),
    baseImponible: contrato.baseImponible?.toString(),
    importeIva: contrato.importeIva?.toString(),
  };
}
