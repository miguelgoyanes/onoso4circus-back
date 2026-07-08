import { ConceptoPersonal } from '../domain/concepto-personal';
import { EstadoPagoGasto, Gasto } from '../domain/gasto';
import { TipoFiscal } from '../domain/tipo-fiscal';

export interface GastoPersonalDetallePublico {
  concepto: ConceptoPersonal;
  importe: string;
}

export interface GastoPublico {
  id: string;
  categoriaId: string;
  categoriaNombre: string;
  fecha: string;
  descripcion: string;
  importe: string;
  plazaId?: string;
  fechaId?: string;
  paseId?: string;
  empleadoId?: string;
  estadoPago: EstadoPagoGasto;
  cuentaPagoId?: string;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: string;
  baseImponible?: string;
  importeIva?: string;
  conceptos: GastoPersonalDetallePublico[];
}

export function toGastoPublico(gasto: Gasto, categoriaNombre: string): GastoPublico {
  return {
    id: gasto.id,
    categoriaId: gasto.categoriaId,
    categoriaNombre,
    fecha: gasto.fecha.toISOString().slice(0, 10),
    descripcion: gasto.descripcion,
    importe: gasto.importe.toString(),
    plazaId: gasto.plazaId,
    fechaId: gasto.fechaId,
    paseId: gasto.paseId,
    empleadoId: gasto.empleadoId,
    estadoPago: gasto.estadoPago,
    cuentaPagoId: gasto.cuentaPagoId,
    tipoFiscal: gasto.tipoFiscal,
    ivaPercent: gasto.ivaPercent?.toString(),
    baseImponible: gasto.baseImponible?.toString(),
    importeIva: gasto.importeIva?.toString(),
    conceptos: gasto.detalle.map((d) => ({ concepto: d.concepto, importe: d.importe.toString() })),
  };
}
