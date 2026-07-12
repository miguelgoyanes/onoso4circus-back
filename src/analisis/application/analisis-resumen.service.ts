import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { finDeDia } from '../../accounting/domain/journal-entry';
import { PlazaService } from '../../plazas/application/plaza.service';
import { PaseService } from '../../plazas/application/pase.service';
import { GastoService } from '../../gastos/application/gasto.service';
import { EstadoPagoGasto } from '../../gastos/domain/gasto';
import { RecepcionStockService } from '../../stock/application/recepcion-stock.service';
import { EstadoPagoRecepcion } from '../../stock/domain/estado-pago-recepcion';
import { ProductoService } from '../../stock/application/producto.service';
import { VentaBarService } from '../../ventas/application/venta-bar.service';
import { VentaEntradasService } from '../../ventas/application/venta-entradas.service';
import { AnalisisService } from './analisis.service';

export interface PendienteResumen {
  total: Decimal;
  count: number;
}

export interface VisionGeneralAnual {
  anio: number;
  facturacionTotal: Decimal;
  facturacionTaquilla: Decimal;
  facturacionBar: Decimal;
  facturacionContratos: Decimal;
  beneficioBruto: Decimal;
  beneficioNeto: Decimal;
  ticketMedioCliente: Decimal;
  flujoCajaAnual: Decimal;
  pendientePagoProveedores: PendienteResumen;
  margenBarPct: Decimal;
}

export interface MediasPlaza {
  numeroPlazas: number;
  facturacionMediaTotal: Decimal;
  facturacionMediaBar: Decimal;
  facturacionMediaTaquilla: Decimal;
  facturacionMediaContratos: Decimal;
  beneficioMedio: Decimal;
  beneficioMedioBar: Decimal;
  margenBarMedioPct: Decimal;
}

export interface MediasPase {
  numeroPases: number;
  facturacionMediaPaseTotal: Decimal;
  facturacionMediaPaseBar: Decimal;
  facturacionMediaPaseTaquilla: Decimal;
}

export interface StockMedioPorPaseItem {
  productoId: string;
  productoNombre: string;
  imagenUrl: string | null;
  cantidadMediaPorPase: Decimal;
}

export interface StockMedioPorPase {
  numeroPases: number;
  unidadesMediasPorPase: Decimal;
  porProducto: StockMedioPorPaseItem[];
}

// Dashboard agregado de la pestaña de Análisis (visión anual + medias all-time por plaza/pase).
// Vive separado de AnalisisService (que ya tiene el desglose por plaza/fecha/pase) porque
// combina fuentes que ese servicio no toca — Stock (pendientes de pago) y conteos de ventas
// (ticket medio) — y para no seguir engordando un único archivo.
@Injectable()
export class AnalisisResumenService {
  constructor(
    private readonly analisisService: AnalisisService,
    private readonly plazaService: PlazaService,
    private readonly paseService: PaseService,
    private readonly gastoService: GastoService,
    private readonly recepcionStockService: RecepcionStockService,
    private readonly ventaBarService: VentaBarService,
    private readonly ventaEntradasService: VentaEntradasService,
    private readonly productoService: ProductoService,
  ) {}

  public async visionGeneralAnual(anio: number): Promise<VisionGeneralAnual> {
    const desde = new Date(`${anio}-01-01`);
    const hasta = finDeDia(`${anio}-12-31`);

    const periodo = await this.analisisService.resumenPeriodo(desde, hasta);

    const nVentasBar = await this.ventaBarService.contarEnRango(desde, hasta);
    const nLotesEntradas = await this.ventaEntradasService.contarEnRango(desde, hasta);
    const totalTransacciones = nVentasBar + nLotesEntradas;
    const ingresosClientes = periodo.ventasBar.plus(periodo.ventasTaquilla);
    const ticketMedioCliente = totalTransacciones > 0 ? ingresosClientes.dividedBy(totalTransacciones) : new Decimal(0);

    const puntosFlujoCaja = await this.analisisService.flujoCaja(desde, hasta);
    const flujoCajaAnual = puntosFlujoCaja.reduce((sum, p) => sum.plus(p.entradas).minus(p.salidas), new Decimal(0));

    const pendientePagoProveedores = await this.pendientePagoProveedores();

    const margenBarPct = periodo.ventasBar.greaterThan(0)
      ? periodo.ventasBar.minus(periodo.costeProductoVendido).dividedBy(periodo.ventasBar).times(100)
      : new Decimal(0);

    return {
      anio,
      facturacionTotal: periodo.ingresos,
      facturacionTaquilla: periodo.ventasTaquilla,
      facturacionBar: periodo.ventasBar,
      facturacionContratos: periodo.ventasContratos,
      beneficioBruto: periodo.ingresos.minus(periodo.costeProductoVendido),
      beneficioNeto: periodo.beneficio,
      ticketMedioCliente,
      flujoCajaAnual,
      pendientePagoProveedores,
      margenBarPct,
    };
  }

  // All-time, deliberadamente sin filtro de año — es la media de "cómo es una plaza", no de
  // un año concreto (ver memoria de diseño: el usuario lo pidió así explícitamente).
  public async mediasPorPlaza(): Promise<MediasPlaza> {
    const plazas = await this.plazaService.listar();
    const n = plazas.length;
    if (n === 0) {
      return {
        numeroPlazas: 0,
        facturacionMediaTotal: new Decimal(0),
        facturacionMediaBar: new Decimal(0),
        facturacionMediaTaquilla: new Decimal(0),
        facturacionMediaContratos: new Decimal(0),
        beneficioMedio: new Decimal(0),
        beneficioMedioBar: new Decimal(0),
        margenBarMedioPct: new Decimal(0),
      };
    }

    const detalles = await Promise.all(plazas.map((p) => this.analisisService.detallePlaza(p.id)));
    const sumar = (obtener: (d: (typeof detalles)[number]) => Decimal) =>
      detalles.reduce((sum, d) => sum.plus(obtener(d)), new Decimal(0));

    const ingresosBarTotal = sumar((d) => d.ingresosBar);
    const costeBarTotal = sumar((d) => d.costeProductoVendidoBar);

    return {
      numeroPlazas: n,
      facturacionMediaTotal: sumar((d) => d.ingresosTotal).dividedBy(n),
      facturacionMediaBar: ingresosBarTotal.dividedBy(n),
      facturacionMediaTaquilla: sumar((d) => d.ingresosTaquilla).dividedBy(n),
      facturacionMediaContratos: sumar((d) => d.ingresosContratos).dividedBy(n),
      beneficioMedio: sumar((d) => d.beneficio).dividedBy(n),
      beneficioMedioBar: sumar((d) => d.beneficioBar).dividedBy(n),
      // Agregado ponderado (Σ/Σ), no media de porcentajes — así una plaza con poco bar no
      // distorsiona el margen medio real del conjunto.
      margenBarMedioPct: ingresosBarTotal.greaterThan(0)
        ? ingresosBarTotal.minus(costeBarTotal).dividedBy(ingresosBarTotal).times(100)
        : new Decimal(0),
    };
  }

  // All-time. No itera pase a pase (no existe ni hace falta un listado plano de pases): la
  // facturación total de bar/taquilla de todo el negocio, dividida entre el nº de pases.
  public async mediasPorPase(): Promise<MediasPase> {
    const numeroPases = await this.paseService.contarTodos();
    if (numeroPases === 0) {
      return {
        numeroPases: 0,
        facturacionMediaPaseTotal: new Decimal(0),
        facturacionMediaPaseBar: new Decimal(0),
        facturacionMediaPaseTaquilla: new Decimal(0),
      };
    }

    const totales = await this.analisisService.resumenPeriodo();
    return {
      numeroPases,
      facturacionMediaPaseTotal: totales.ventasBar.plus(totales.ventasTaquilla).dividedBy(numeroPases),
      facturacionMediaPaseBar: totales.ventasBar.dividedBy(numeroPases),
      facturacionMediaPaseTaquilla: totales.ventasTaquilla.dividedBy(numeroPases),
    };
  }

  // All-time, mismo criterio que mediasPorPase. Solo cuenta lo vendido en el bar (líneas de
  // VentaBar) — no mermas ni ajustes de stock, que son otro tipo de baja distinto de "lo que
  // se consume por pase".
  public async stockMedioPorPase(): Promise<StockMedioPorPase> {
    const numeroPases = await this.paseService.contarTodos();
    if (numeroPases === 0) {
      return { numeroPases: 0, unidadesMediasPorPase: new Decimal(0), porProducto: [] };
    }

    const ventas = await this.ventaBarService.listar();
    const cantidadPorProducto = new Map<string, number>();
    for (const venta of ventas) {
      for (const linea of venta.lineas) {
        cantidadPorProducto.set(linea.productoId, (cantidadPorProducto.get(linea.productoId) ?? 0) + linea.cantidad);
      }
    }

    const productos = await this.productoService.listar();
    const productoPorId = new Map(productos.map((p) => [p.id, p]));

    let totalUnidades = 0;
    const porProducto: StockMedioPorPaseItem[] = [];
    for (const [productoId, cantidad] of cantidadPorProducto) {
      totalUnidades += cantidad;
      const producto = productoPorId.get(productoId);
      porProducto.push({
        productoId,
        productoNombre: producto?.nombre ?? 'Producto eliminado',
        imagenUrl: producto?.imagenUrl ?? null,
        cantidadMediaPorPase: new Decimal(cantidad).dividedBy(numeroPases),
      });
    }
    porProducto.sort((a, b) => b.cantidadMediaPorPase.comparedTo(a.cantidadMediaPorPase));

    return {
      numeroPases,
      unidadesMediasPorPase: new Decimal(totalUnidades).dividedBy(numeroPases),
      porProducto,
    };
  }

  // All-time — una deuda pendiente lo sigue estando cruce el año o no (mismo criterio que ya
  // usa resumenGeneral con gastosPendientes/cobrosPendientes).
  private async pendientePagoProveedores(): Promise<PendienteResumen> {
    const [gastosPendientes, recepcionesPendientes] = await Promise.all([
      this.gastoService.listar({ estadoPago: EstadoPagoGasto.PENDIENTE_PAGO }),
      this.recepcionStockService.listar({ estadoPago: EstadoPagoRecepcion.PENDIENTE_PAGO }),
    ]);
    const totalGastos = gastosPendientes.reduce((sum, g) => sum.plus(g.importe), new Decimal(0));
    const totalRecepciones = recepcionesPendientes.reduce((sum, r) => sum.plus(r.importeTotal), new Decimal(0));
    return {
      total: totalGastos.plus(totalRecepciones),
      count: gastosPendientes.length + recepcionesPendientes.length,
    };
  }
}
