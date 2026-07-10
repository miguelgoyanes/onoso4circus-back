import {
  DetallePlaza,
  PuntoFlujoCaja,
  ResumenActivos,
  ResumenGeneral,
  ResumenPeriodo,
  ResumenPlaza,
} from '../application/analisis.service';

export interface ResumenPeriodoPublico {
  ingresos: string;
  gastos: string;
  beneficio: string;
  ventasTaquilla: string;
  ventasBar: string;
  ventasContratos: string;
}

export interface ResumenGeneralPublico {
  patrimonioLiquido: string;
  periodoActual: ResumenPeriodoPublico;
  periodoAnterior: ResumenPeriodoPublico;
  gastosPendientes: { total: string; count: number };
  cobrosPendientes: { total: string; count: number };
}

export interface ResumenPlazaPublico {
  plazaId: string;
  plazaNombre: string;
  ingresos: string;
  gastos: string;
  beneficio: string;
}

export interface DetallePlazaPublico {
  plazaId: string;
  plazaNombre: string;
  ingresosTaquilla: string;
  ingresosBar: string;
  ingresosContratos: string;
  ingresosTotal: string;
  gastosPorCategoria: { categoriaNombre: string; importe: string }[];
  costePersonal: string;
  gastosTotal: string;
  beneficio: string;
}

export interface ResumenActivosPublico {
  valorNetoContableTotal: string;
  amortizacionAcumuladaTotal: string;
  porCategoria: { categoriaNombre: string; valorNetoContable: string; amortizacionAcumulada: string }[];
}

export interface PuntoFlujoCajaPublico {
  periodo: string;
  entradas: string;
  salidas: string;
}

function presentarPeriodo(p: ResumenPeriodo): ResumenPeriodoPublico {
  return {
    ingresos: p.ingresos.toString(),
    gastos: p.gastos.toString(),
    beneficio: p.beneficio.toString(),
    ventasTaquilla: p.ventasTaquilla.toString(),
    ventasBar: p.ventasBar.toString(),
    ventasContratos: p.ventasContratos.toString(),
  };
}

export function toResumenGeneralPublico(r: ResumenGeneral): ResumenGeneralPublico {
  return {
    patrimonioLiquido: r.patrimonioLiquido.toString(),
    periodoActual: presentarPeriodo(r.periodoActual),
    periodoAnterior: presentarPeriodo(r.periodoAnterior),
    gastosPendientes: { total: r.gastosPendientes.total.toString(), count: r.gastosPendientes.count },
    cobrosPendientes: { total: r.cobrosPendientes.total.toString(), count: r.cobrosPendientes.count },
  };
}

export function toResumenPlazaPublico(r: ResumenPlaza): ResumenPlazaPublico {
  return {
    plazaId: r.plazaId,
    plazaNombre: r.plazaNombre,
    ingresos: r.ingresos.toString(),
    gastos: r.gastos.toString(),
    beneficio: r.beneficio.toString(),
  };
}

export function toDetallePlazaPublico(d: DetallePlaza): DetallePlazaPublico {
  return {
    plazaId: d.plazaId,
    plazaNombre: d.plazaNombre,
    ingresosTaquilla: d.ingresosTaquilla.toString(),
    ingresosBar: d.ingresosBar.toString(),
    ingresosContratos: d.ingresosContratos.toString(),
    ingresosTotal: d.ingresosTotal.toString(),
    gastosPorCategoria: d.gastosPorCategoria.map((g) => ({ categoriaNombre: g.categoriaNombre, importe: g.importe.toString() })),
    costePersonal: d.costePersonal.toString(),
    gastosTotal: d.gastosTotal.toString(),
    beneficio: d.beneficio.toString(),
  };
}

export function toResumenActivosPublico(r: ResumenActivos): ResumenActivosPublico {
  return {
    valorNetoContableTotal: r.valorNetoContableTotal.toString(),
    amortizacionAcumuladaTotal: r.amortizacionAcumuladaTotal.toString(),
    porCategoria: r.porCategoria.map((c) => ({
      categoriaNombre: c.categoriaNombre,
      valorNetoContable: c.valorNetoContable.toString(),
      amortizacionAcumulada: c.amortizacionAcumulada.toString(),
    })),
  };
}

export function toPuntoFlujoCajaPublico(p: PuntoFlujoCaja): PuntoFlujoCajaPublico {
  return { periodo: p.periodo, entradas: p.entradas.toString(), salidas: p.salidas.toString() };
}
