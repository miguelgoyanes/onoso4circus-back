import {
  Asiento,
  Balance,
  CuentaResumen,
  LibroMayor,
  LineaAsiento,
  LineaBalance,
  LineaPyg,
  MovimientoMayor,
  Pyg,
} from '../application/contabilidad.service';

export interface CuentaResumenPublico {
  id: string;
  code: string;
  name: string;
  type: string;
}

export interface LineaAsientoPublico {
  cuenta: CuentaResumenPublico;
  debit: string;
  credit: string;
}

export interface AsientoPublico {
  id: string;
  fecha: string;
  descripcion: string;
  lineas: LineaAsientoPublico[];
}

export interface MovimientoMayorPublico {
  fecha: string;
  descripcion: string;
  debit: string;
  credit: string;
  saldo: string;
}

export interface LibroMayorPublico {
  cuenta: CuentaResumenPublico;
  saldoInicial: string;
  movimientos: MovimientoMayorPublico[];
  saldoFinal: string;
}

export interface LineaPygPublico {
  cuenta: CuentaResumenPublico;
  importe: string;
}

export interface PygPublico {
  ingresos: LineaPygPublico[];
  totalIngresos: string;
  gastos: LineaPygPublico[];
  totalGastos: string;
  resultado: string;
}

export interface LineaBalancePublico {
  cuenta: CuentaResumenPublico;
  saldo: string;
}

export interface BalancePublico {
  activo: LineaBalancePublico[];
  totalActivo: string;
  pasivo: LineaBalancePublico[];
  totalPasivo: string;
  patrimonioNeto: LineaBalancePublico[];
  totalPatrimonioNeto: string;
}

function presentarCuenta(cuenta: CuentaResumen): CuentaResumenPublico {
  return { id: cuenta.id, code: cuenta.code, name: cuenta.name, type: cuenta.type };
}

export function toCuentaResumenPublico(cuenta: CuentaResumen): CuentaResumenPublico {
  return presentarCuenta(cuenta);
}

function presentarLineaAsiento(l: LineaAsiento): LineaAsientoPublico {
  return { cuenta: presentarCuenta(l.cuenta), debit: l.debit.toString(), credit: l.credit.toString() };
}

export function toAsientoPublico(a: Asiento): AsientoPublico {
  return {
    id: a.id,
    fecha: a.fecha.toISOString(),
    descripcion: a.descripcion,
    lineas: a.lineas.map(presentarLineaAsiento),
  };
}

function presentarMovimientoMayor(m: MovimientoMayor): MovimientoMayorPublico {
  return {
    fecha: m.fecha.toISOString(),
    descripcion: m.descripcion,
    debit: m.debit.toString(),
    credit: m.credit.toString(),
    saldo: m.saldo.toString(),
  };
}

export function toLibroMayorPublico(l: LibroMayor): LibroMayorPublico {
  return {
    cuenta: presentarCuenta(l.cuenta),
    saldoInicial: l.saldoInicial.toString(),
    movimientos: l.movimientos.map(presentarMovimientoMayor),
    saldoFinal: l.saldoFinal.toString(),
  };
}

function presentarLineaPyg(l: LineaPyg): LineaPygPublico {
  return { cuenta: presentarCuenta(l.cuenta), importe: l.importe.toString() };
}

export function toPygPublico(p: Pyg): PygPublico {
  return {
    ingresos: p.ingresos.map(presentarLineaPyg),
    totalIngresos: p.totalIngresos.toString(),
    gastos: p.gastos.map(presentarLineaPyg),
    totalGastos: p.totalGastos.toString(),
    resultado: p.resultado.toString(),
  };
}

function presentarLineaBalance(l: LineaBalance): LineaBalancePublico {
  return { cuenta: presentarCuenta(l.cuenta), saldo: l.saldo.toString() };
}

export function toBalancePublico(b: Balance): BalancePublico {
  return {
    activo: b.activo.map(presentarLineaBalance),
    totalActivo: b.totalActivo.toString(),
    pasivo: b.pasivo.map(presentarLineaBalance),
    totalPasivo: b.totalPasivo.toString(),
    patrimonioNeto: b.patrimonioNeto.map(presentarLineaBalance),
    totalPatrimonioNeto: b.totalPatrimonioNeto.toString(),
  };
}
