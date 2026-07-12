import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { AccountingService } from '../../accounting/application/accounting.service';
import { AccountType } from '../../accounting/domain/account';
import { JournalLine } from '../../accounting/domain/journal-line';
import { PlazaService } from '../../plazas/application/plaza.service';
import { FechaService } from '../../plazas/application/fecha.service';
import { PaseService } from '../../plazas/application/pase.service';
import { GastoService } from '../../gastos/application/gasto.service';
import { EstadoPagoGasto } from '../../gastos/domain/gasto';
import { ContratoIngresoService } from '../../ventas/application/contrato-ingreso.service';
import { EstadoCobro } from '../../ventas/domain/estado-cobro';
import { ActivoService } from '../../activos/application/activo.service';
import { CategoriaActivoService } from '../../activos/application/categoria-activo.service';

const CUENTA_INGRESOS_TAQUILLA = '700001';
const CUENTA_INGRESOS_BAR = '701001';
const CUENTA_INGRESOS_CONTRATOS = '702001';
const CUENTA_COSTE_PRODUCTO_VENDIDO = '600001';
const CUENTAS_PERSONAL = ['640001', '641001', '642001', '643001'];

export interface ResumenPeriodo {
  ingresos: Decimal;
  gastos: Decimal;
  beneficio: Decimal;
  costeProductoVendido: Decimal;
  ventasTaquilla: Decimal;
  ventasBar: Decimal;
  ventasContratos: Decimal;
}

export interface PendientesResumen {
  total: Decimal;
  count: number;
}

export interface ResumenGeneral {
  patrimonioLiquido: Decimal;
  periodoActual: ResumenPeriodo;
  periodoAnterior: ResumenPeriodo;
  gastosPendientes: PendientesResumen;
  cobrosPendientes: PendientesResumen;
}

export interface ResumenPlaza {
  plazaId: string;
  plazaNombre: string;
  ingresos: Decimal;
  gastos: Decimal;
  beneficio: Decimal;
}

export interface GastoPorCategoria {
  categoriaNombre: string;
  importe: Decimal;
}

export interface DetalleAgregado {
  ingresosTaquilla: Decimal;
  ingresosBar: Decimal;
  ingresosContratos: Decimal;
  ingresosTotal: Decimal;
  costeProductoVendidoBar: Decimal;
  costePersonal: Decimal;
  gastosPorCategoria: GastoPorCategoria[];
  gastosTotal: Decimal;
  beneficio: Decimal;
  beneficioBar: Decimal;
}

export interface DetallePlaza extends DetalleAgregado {
  plazaId: string;
  plazaNombre: string;
}

export interface DetalleFecha extends DetalleAgregado {
  fechaId: string;
  plazaId: string;
  plazaNombre: string;
  fecha: Date;
}

export interface DetallePase extends DetalleAgregado {
  paseId: string;
  fechaId: string;
  plazaId: string;
  plazaNombre: string;
  fecha: Date;
  paseHora: string;
  paseNombre?: string;
}

export interface ResumenActivoCategoria {
  categoriaNombre: string;
  valorNetoContable: Decimal;
  amortizacionAcumulada: Decimal;
}

export interface ResumenActivos {
  valorNetoContableTotal: Decimal;
  amortizacionAcumuladaTotal: Decimal;
  porCategoria: ResumenActivoCategoria[];
}

export interface PuntoFlujoCaja {
  periodo: string;
  entradas: Decimal;
  salidas: Decimal;
}

@Injectable()
export class AnalisisService {
  constructor(
    private readonly accountingService: AccountingService,
    private readonly plazaService: PlazaService,
    private readonly fechaService: FechaService,
    private readonly paseService: PaseService,
    private readonly gastoService: GastoService,
    private readonly contratoIngresoService: ContratoIngresoService,
    private readonly activoService: ActivoService,
    private readonly categoriaActivoService: CategoriaActivoService,
  ) {}

  public async resumenGeneral(desde: Date, hasta: Date): Promise<ResumenGeneral> {
    const periodoActual = await this.resumenPeriodo(desde, hasta);

    const duracionMs = hasta.getTime() - desde.getTime();
    const hastaAnterior = new Date(desde.getTime() - 1);
    const desdeAnterior = new Date(hastaAnterior.getTime() - duracionMs);
    const periodoAnterior = await this.resumenPeriodo(desdeAnterior, hastaAnterior);

    const patrimonioLiquido = await this.accountingService.patrimonioLiquidoTotal();

    const gastosPendientesList = await this.gastoService.listar({ estadoPago: EstadoPagoGasto.PENDIENTE_PAGO });
    const gastosPendientes: PendientesResumen = {
      total: gastosPendientesList.reduce((sum, g) => sum.plus(g.importe), new Decimal(0)),
      count: gastosPendientesList.length,
    };

    const cobrosPendientesList = await this.contratoIngresoService.listar({ estadoCobro: EstadoCobro.PENDIENTE_COBRO });
    const cobrosPendientes: PendientesResumen = {
      total: cobrosPendientesList.reduce((sum, c) => sum.plus(c.importe), new Decimal(0)),
      count: cobrosPendientesList.length,
    };

    return { patrimonioLiquido, periodoActual, periodoAnterior, gastosPendientes, cobrosPendientes };
  }

  public async porPlaza(desde?: Date, hasta?: Date): Promise<ResumenPlaza[]> {
    const plazas = await this.plazaService.listar();
    const resultados = await Promise.all(
      plazas.map(async (plaza) => {
        const { ingresos, gastos, beneficio } = await this.resumenPeriodo(desde, hasta, plaza.id);
        return { plazaId: plaza.id, plazaNombre: plaza.nombre, ingresos, gastos, beneficio };
      }),
    );
    return resultados.sort((a, b) => b.beneficio.comparedTo(a.beneficio));
  }

  public async detallePlaza(plazaId: string, desde?: Date, hasta?: Date): Promise<DetallePlaza> {
    const plaza = await this.plazaService.obtener(plazaId);
    const lines = await this.accountingService.entriesByDimension({ plazaId, fechaDesde: desde, fechaHasta: hasta });
    return { plazaId, plazaNombre: plaza.nombre, ...this.bucketearDetalle(lines) };
  }

  public async detalleFecha(fechaId: string): Promise<DetalleFecha> {
    const fecha = await this.fechaService.obtener(fechaId);
    const plaza = await this.plazaService.obtener(fecha.plazaId);
    const lines = await this.accountingService.entriesByDimension({ fechaId });
    return {
      fechaId,
      plazaId: plaza.id,
      plazaNombre: plaza.nombre,
      fecha: fecha.fecha,
      ...this.bucketearDetalle(lines),
    };
  }

  public async detallePase(paseId: string): Promise<DetallePase> {
    const pase = await this.paseService.obtener(paseId);
    const fecha = await this.fechaService.obtener(pase.fechaId);
    const plaza = await this.plazaService.obtener(fecha.plazaId);
    const lines = await this.accountingService.entriesByDimension({ paseId });
    return {
      paseId,
      fechaId: fecha.id,
      plazaId: plaza.id,
      plazaNombre: plaza.nombre,
      fecha: fecha.fecha,
      paseHora: pase.hora,
      paseNombre: pase.nombre,
      ...this.bucketearDetalle(lines),
    };
  }

  public async resumenActivos(): Promise<ResumenActivos> {
    const activos = await this.activoService.listar();
    const categorias = await this.categoriaActivoService.listarConUso();
    const nombrePorCategoriaId = new Map(categorias.map(({ categoria }) => [categoria.id, categoria.nombre]));

    let valorNetoContableTotal = new Decimal(0);
    let amortizacionAcumuladaTotal = new Decimal(0);
    const porCategoriaMap = new Map<string, { valorNetoContable: Decimal; amortizacionAcumulada: Decimal }>();

    for (const activo of activos) {
      const valorNeto = activo.coste.minus(activo.amortizacionAcumulada);
      valorNetoContableTotal = valorNetoContableTotal.plus(valorNeto);
      amortizacionAcumuladaTotal = amortizacionAcumuladaTotal.plus(activo.amortizacionAcumulada);

      const nombreCategoria = nombrePorCategoriaId.get(activo.categoriaId) ?? 'Sin categoría';
      const actual = porCategoriaMap.get(nombreCategoria) ?? {
        valorNetoContable: new Decimal(0),
        amortizacionAcumulada: new Decimal(0),
      };
      porCategoriaMap.set(nombreCategoria, {
        valorNetoContable: actual.valorNetoContable.plus(valorNeto),
        amortizacionAcumulada: actual.amortizacionAcumulada.plus(activo.amortizacionAcumulada),
      });
    }

    const porCategoria: ResumenActivoCategoria[] = [...porCategoriaMap.entries()].map(([categoriaNombre, v]) => ({
      categoriaNombre,
      ...v,
    }));

    return { valorNetoContableTotal, amortizacionAcumuladaTotal, porCategoria };
  }

  // Se apoya en movimientosPorCuenta (no en entriesByDimension) porque las líneas que devuelve
  // entriesByDimension no llevan la fecha del asiento — solo movimientosPorCuenta la trae.
  public async flujoCaja(desde: Date, hasta: Date): Promise<PuntoFlujoCaja[]> {
    const cuentasDeDinero = await this.accountingService.listarCuentasDeDinero();
    const movimientosPorCuenta = await Promise.all(
      cuentasDeDinero.map((cuenta) => this.accountingService.movimientosPorCuenta(cuenta.id)),
    );
    const movimientos = movimientosPorCuenta.flat().filter((m) => m.fecha >= desde && m.fecha <= hasta);

    const porPeriodo = new Map<string, { entradas: Decimal; salidas: Decimal }>();
    for (const m of movimientos) {
      const periodo = `${m.fecha.getUTCFullYear()}-${String(m.fecha.getUTCMonth() + 1).padStart(2, '0')}`;
      const actual = porPeriodo.get(periodo) ?? { entradas: new Decimal(0), salidas: new Decimal(0) };
      porPeriodo.set(periodo, { entradas: actual.entradas.plus(m.debit), salidas: actual.salidas.plus(m.credit) });
    }

    return [...porPeriodo.entries()]
      .map(([periodo, v]) => ({ periodo, ...v }))
      .sort((a, b) => a.periodo.localeCompare(b.periodo));
  }

  // Público — lo reutiliza AnalisisResumenService para la visión general anual y las medias
  // por plaza/pase, además de los usos internos de este servicio (resumenGeneral/porPlaza).
  public async resumenPeriodo(desde?: Date, hasta?: Date, plazaId?: string): Promise<ResumenPeriodo> {
    const lines = await this.accountingService.entriesByDimension({ fechaDesde: desde, fechaHasta: hasta, plazaId });

    let ingresos = new Decimal(0);
    let gastos = new Decimal(0);
    let costeProductoVendido = new Decimal(0);
    let ventasTaquilla = new Decimal(0);
    let ventasBar = new Decimal(0);
    let ventasContratos = new Decimal(0);

    for (const line of lines) {
      if (line.account.type === AccountType.INCOME) {
        const neto = line.credit.minus(line.debit);
        ingresos = ingresos.plus(neto);
        if (line.account.code === CUENTA_INGRESOS_TAQUILLA) ventasTaquilla = ventasTaquilla.plus(neto);
        else if (line.account.code === CUENTA_INGRESOS_BAR) ventasBar = ventasBar.plus(neto);
        else if (line.account.code === CUENTA_INGRESOS_CONTRATOS) ventasContratos = ventasContratos.plus(neto);
      } else if (line.account.type === AccountType.EXPENSE) {
        const neto = line.debit.minus(line.credit);
        gastos = gastos.plus(neto);
        if (line.account.code === CUENTA_COSTE_PRODUCTO_VENDIDO) costeProductoVendido = costeProductoVendido.plus(neto);
      }
    }

    return {
      ingresos,
      gastos,
      beneficio: ingresos.minus(gastos),
      costeProductoVendido,
      ventasTaquilla,
      ventasBar,
      ventasContratos,
    };
  }

  // Compartido por detallePlaza/detalleFecha/detallePase — mismas líneas (filtradas por la
  // dimensión que corresponda), mismo desglose de ingresos/gastos/coste de bar.
  private bucketearDetalle(lines: JournalLine[]): DetalleAgregado {
    let ingresosTaquilla = new Decimal(0);
    let ingresosBar = new Decimal(0);
    let ingresosContratos = new Decimal(0);
    let costePersonal = new Decimal(0);
    let costeProductoVendidoBar = new Decimal(0);
    const gastosPorCategoriaMap = new Map<string, Decimal>();

    for (const line of lines) {
      if (line.account.type === AccountType.INCOME) {
        const neto = line.credit.minus(line.debit);
        if (line.account.code === CUENTA_INGRESOS_TAQUILLA) ingresosTaquilla = ingresosTaquilla.plus(neto);
        else if (line.account.code === CUENTA_INGRESOS_BAR) ingresosBar = ingresosBar.plus(neto);
        else if (line.account.code === CUENTA_INGRESOS_CONTRATOS) ingresosContratos = ingresosContratos.plus(neto);
      } else if (line.account.type === AccountType.EXPENSE) {
        const neto = line.debit.minus(line.credit);
        if (CUENTAS_PERSONAL.includes(line.account.code)) {
          costePersonal = costePersonal.plus(neto);
        } else {
          const actual = gastosPorCategoriaMap.get(line.account.name) ?? new Decimal(0);
          gastosPorCategoriaMap.set(line.account.name, actual.plus(neto));
        }
        if (line.account.code === CUENTA_COSTE_PRODUCTO_VENDIDO) {
          costeProductoVendidoBar = costeProductoVendidoBar.plus(neto);
        }
      }
    }

    const ingresosTotal = ingresosTaquilla.plus(ingresosBar).plus(ingresosContratos);
    const gastosPorCategoria: GastoPorCategoria[] = [...gastosPorCategoriaMap.entries()].map(([categoriaNombre, importe]) => ({
      categoriaNombre,
      importe,
    }));
    const gastosTotal = gastosPorCategoria.reduce((sum, g) => sum.plus(g.importe), costePersonal);
    const beneficio = ingresosTotal.minus(gastosTotal);
    const beneficioBar = ingresosBar.minus(costeProductoVendidoBar);

    return {
      ingresosTaquilla,
      ingresosBar,
      ingresosContratos,
      ingresosTotal,
      costeProductoVendidoBar,
      costePersonal,
      gastosPorCategoria,
      gastosTotal,
      beneficio,
      beneficioBar,
    };
  }
}
