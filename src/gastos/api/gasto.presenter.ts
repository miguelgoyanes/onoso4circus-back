import {
  CategoriaGastoGeneral,
  CategoriaGastoPlaza,
  ConceptoGastoDerivado,
  EstadoPagoGasto,
  Gasto,
  TipoGasto,
} from '../domain/gasto';

export interface GastoDerivadoPublico {
  concepto: ConceptoGastoDerivado;
  importe: string;
}

export interface GastoPublico {
  id: string;
  tipo: TipoGasto;
  fecha: string;
  descripcion: string;
  estadoPago: EstadoPagoGasto;
  importeTotal: string;
  plazaId?: string;
  fechaId?: string;
  paseId?: string;
  empleadoId?: string;
  asignacionId?: string;
  importeSalario?: string;
  costeSs?: string;
  gastosDerivados: GastoDerivadoPublico[];
  categoriaPlaza?: CategoriaGastoPlaza;
  categoriaGeneral?: CategoriaGastoGeneral;
  importe?: string;
}

export function toGastoPublico(gasto: Gasto): GastoPublico {
  return {
    id: gasto.id,
    tipo: gasto.tipo,
    fecha: gasto.fecha.toISOString().slice(0, 10),
    descripcion: gasto.descripcion,
    estadoPago: gasto.estadoPago,
    importeTotal: gasto.importeTotal.toString(),
    plazaId: gasto.plazaId,
    fechaId: gasto.fechaId,
    paseId: gasto.paseId,
    empleadoId: gasto.empleadoId,
    asignacionId: gasto.asignacionId,
    importeSalario: gasto.importeSalario?.toString(),
    costeSs: gasto.costeSs?.toString(),
    gastosDerivados: gasto.gastosDerivados.map((d) => ({
      concepto: d.concepto,
      importe: d.importe.toString(),
    })),
    categoriaPlaza: gasto.categoriaPlaza,
    categoriaGeneral: gasto.categoriaGeneral,
    importe: gasto.importe?.toString(),
  };
}
