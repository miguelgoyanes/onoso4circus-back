import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { AccountingService } from '../../accounting/application/accounting.service';
import { Account, AccountType } from '../../accounting/domain/account';

// Código PGC real de "Resultado del ejercicio" — se usa solo para mostrar la línea de
// resultado calculada al vuelo dentro del Patrimonio Neto del balance, no corresponde a
// ninguna Account persistida (no se genera ningún asiento de cierre).
const CODIGO_RESULTADO_EJERCICIO = '129';

export interface CuentaResumen {
  id: string;
  code: string;
  name: string;
  type: AccountType;
}

export interface LineaAsiento {
  cuenta: CuentaResumen;
  debit: Decimal;
  credit: Decimal;
}

export interface Asiento {
  id: string;
  fecha: Date;
  descripcion: string;
  lineas: LineaAsiento[];
}

export interface MovimientoMayor {
  fecha: Date;
  descripcion: string;
  debit: Decimal;
  credit: Decimal;
  saldo: Decimal;
}

export interface LibroMayor {
  cuenta: CuentaResumen;
  saldoInicial: Decimal;
  movimientos: MovimientoMayor[];
  saldoFinal: Decimal;
}

export interface LineaPyg {
  cuenta: CuentaResumen;
  importe: Decimal;
}

export interface Pyg {
  ingresos: LineaPyg[];
  totalIngresos: Decimal;
  gastos: LineaPyg[];
  totalGastos: Decimal;
  resultado: Decimal;
}

export interface LineaBalance {
  cuenta: CuentaResumen;
  saldo: Decimal;
}

export interface Balance {
  activo: LineaBalance[];
  totalActivo: Decimal;
  pasivo: LineaBalance[];
  totalPasivo: Decimal;
  patrimonioNeto: LineaBalance[];
  totalPatrimonioNeto: Decimal;
}

function cuentaResumen(cuenta: Account): CuentaResumen {
  return { id: cuenta.id, code: cuenta.code, name: cuenta.name, type: cuenta.type };
}

function diaAnterior(fecha: Date): Date {
  return new Date(fecha.getTime() - 1);
}

@Injectable()
export class ContabilidadService {
  constructor(private readonly accountingService: AccountingService) {}

  public async listarCuentas(): Promise<CuentaResumen[]> {
    const cuentas = await this.accountingService.listarCuentas();
    return cuentas.map(cuentaResumen).sort((a, b) => a.code.localeCompare(b.code));
  }

  public async libroDiario(filter: {
    accountIds?: string[];
    fechaDesde?: Date;
    fechaHasta?: Date;
  }): Promise<Asiento[]> {
    const entries = await this.accountingService.listarAsientos(filter);
    return entries.map((entry) => ({
      id: entry.id,
      fecha: entry.date,
      descripcion: entry.description,
      lineas: entry.lines.map((line) => ({
        cuenta: cuentaResumen(line.account),
        debit: line.debit,
        credit: line.credit,
      })),
    }));
  }

  public async libroMayor(cuentaId: string, desde: Date, hasta: Date): Promise<LibroMayor> {
    const cuenta = await this.accountingService.obtenerCuentaPorId(cuentaId);
    const debitoNormal = cuenta.esDebitoNormal();
    const netoDe = (m: { debit: Decimal; credit: Decimal }) =>
      debitoNormal ? m.debit.minus(m.credit) : m.credit.minus(m.debit);

    const previos = await this.accountingService.movimientosPorCuentaEnRango(
      cuentaId,
      undefined,
      diaAnterior(desde),
    );
    const saldoInicial = previos.reduce((acc, m) => acc.plus(netoDe(m)), new Decimal(0));

    let saldo = saldoInicial;
    const enRango = await this.accountingService.movimientosPorCuentaEnRango(cuentaId, desde, hasta);
    const movimientos: MovimientoMayor[] = enRango.map((m) => {
      saldo = saldo.plus(netoDe(m));
      return { fecha: m.fecha, descripcion: m.descripcion, debit: m.debit, credit: m.credit, saldo };
    });

    return { cuenta: cuentaResumen(cuenta), saldoInicial, movimientos, saldoFinal: saldo };
  }

  public async pyg(desde: Date, hasta: Date): Promise<Pyg> {
    const lines = await this.accountingService.entriesByDimension({ fechaDesde: desde, fechaHasta: hasta });

    const ingresosMap = new Map<string, LineaPyg>();
    const gastosMap = new Map<string, LineaPyg>();

    for (const line of lines) {
      if (line.account.type === AccountType.INCOME) {
        const actual = ingresosMap.get(line.account.id) ?? { cuenta: cuentaResumen(line.account), importe: new Decimal(0) };
        ingresosMap.set(line.account.id, { ...actual, importe: actual.importe.plus(line.credit.minus(line.debit)) });
      } else if (line.account.type === AccountType.EXPENSE) {
        const actual = gastosMap.get(line.account.id) ?? { cuenta: cuentaResumen(line.account), importe: new Decimal(0) };
        gastosMap.set(line.account.id, { ...actual, importe: actual.importe.plus(line.debit.minus(line.credit)) });
      }
    }

    const ingresos = [...ingresosMap.values()].sort((a, b) => a.cuenta.code.localeCompare(b.cuenta.code));
    const gastos = [...gastosMap.values()].sort((a, b) => a.cuenta.code.localeCompare(b.cuenta.code));
    const totalIngresos = ingresos.reduce((sum, l) => sum.plus(l.importe), new Decimal(0));
    const totalGastos = gastos.reduce((sum, l) => sum.plus(l.importe), new Decimal(0));

    return { ingresos, totalIngresos, gastos, totalGastos, resultado: totalIngresos.minus(totalGastos) };
  }

  // Resultado (Ingresos-Gastos) se calcula al vuelo y se añade como línea del Patrimonio
  // Neto — no se postea ningún asiento de cierre de ejercicio.
  public async balance(fecha: Date): Promise<Balance> {
    const lines = await this.accountingService.entriesByDimension({ fechaHasta: fecha });
    const saldosPorCuenta = new Map<string, LineaBalance>();

    for (const line of lines) {
      const actual = saldosPorCuenta.get(line.account.id) ?? { cuenta: cuentaResumen(line.account), saldo: new Decimal(0) };
      const neto = line.account.esDebitoNormal() ? line.debit.minus(line.credit) : line.credit.minus(line.debit);
      saldosPorCuenta.set(line.account.id, { ...actual, saldo: actual.saldo.plus(neto) });
    }

    const activo: LineaBalance[] = [];
    const pasivo: LineaBalance[] = [];
    const patrimonioNeto: LineaBalance[] = [];
    let resultado = new Decimal(0);

    for (const { cuenta, saldo } of saldosPorCuenta.values()) {
      if (cuenta.type === AccountType.ASSET) activo.push({ cuenta, saldo });
      else if (cuenta.type === AccountType.LIABILITY) pasivo.push({ cuenta, saldo });
      else if (cuenta.type === AccountType.EQUITY) patrimonioNeto.push({ cuenta, saldo });
      else if (cuenta.type === AccountType.INCOME) resultado = resultado.plus(saldo);
      else if (cuenta.type === AccountType.EXPENSE) resultado = resultado.minus(saldo);
    }

    patrimonioNeto.push({
      cuenta: {
        id: 'resultado-ejercicio',
        code: CODIGO_RESULTADO_EJERCICIO,
        name: 'Resultado del ejercicio (pendiente de aplicar)',
        type: AccountType.EQUITY,
      },
      saldo: resultado,
    });

    const porCodigo = (a: LineaBalance, b: LineaBalance) => a.cuenta.code.localeCompare(b.cuenta.code);
    activo.sort(porCodigo);
    pasivo.sort(porCodigo);
    patrimonioNeto.sort(porCodigo);

    return {
      activo,
      totalActivo: activo.reduce((sum, l) => sum.plus(l.saldo), new Decimal(0)),
      pasivo,
      totalPasivo: pasivo.reduce((sum, l) => sum.plus(l.saldo), new Decimal(0)),
      patrimonioNeto,
      totalPatrimonioNeto: patrimonioNeto.reduce((sum, l) => sum.plus(l.saldo), new Decimal(0)),
    };
  }
}
