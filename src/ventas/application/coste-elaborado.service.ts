import { randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { ProductoService } from '../../stock/application/producto.service';
import { RecepcionStockService } from '../../stock/application/recepcion-stock.service';
import { FamiliaElaboradoService } from '../../stock/application/familia-elaborado.service';
import { RecepcionStock } from '../../stock/domain/recepcion-stock';
import { Producto } from '../../stock/domain/producto';
import { AccountingService } from '../../accounting/application/accounting.service';
import { JournalEntry } from '../../accounting/domain/journal-entry';
import { JournalLine } from '../../accounting/domain/journal-line';
import { VENTA_BAR_REPOSITORY } from './venta-bar.repository';
import type { VentaBarRepository } from './venta-bar.repository';

const CUENTA_STOCK = '300001';
const CUENTA_COSTE_PRODUCTO_VENDIDO = '600001';

// Coste de un producto ELABORADO (ej. palomita pequeña/grande). No se calcula en caliente
// contra ventas en curso — eso no garantizaba que la suma de lo reconocido a lo largo de la
// vida de un lote cuadrara con lo que costó de verdad (ver conversación de diseño: dividir un
// coste fijo entre "lo vendido hasta ahora" no converge al total real).
//
// En su lugar: las VENTAS de un ELABORADO solo asientan ingresos (ver VentaBarService), nunca
// coste. El coste se reconoce UNA VEZ, exacto, cuando se CIERRA un lote de insumo (al abrir el
// siguiente) — en ese momento ya se sabe con certeza cuánto se vendió durante toda su ventana,
// así que se reparte el coste total del lote sin aproximar nada. Cada cierre además actualiza
// una media histórica por insumo (ProductoService.registrarCierreLoteInsumo, estilo PMP), que
// es lo que se muestra como "coste aproximado" mientras el lote actual sigue abierto.
//
// Vive en ventas (no en stock) porque necesita VentaBarRepository — stock no puede depender
// de ventas (dependencia inversa).
@Injectable()
export class CosteElaboradoService {
  constructor(
    private readonly productoService: ProductoService,
    private readonly recepcionStockService: RecepcionStockService,
    private readonly familiaService: FamiliaElaboradoService,
    private readonly accountingService: AccountingService,
    @Inject(VENTA_BAR_REPOSITORY) private readonly ventaBarRepository: VentaBarRepository,
  ) {}

  // Suma de la media histórica de cada insumo vinculado × el factor de equivalencia del
  // elaborado — una simple lectura, sin consultar ventas. Aproximado por construcción: se
  // basa en lotes YA cerrados, no en el que esté abierto ahora mismo.
  public async costeAproximado(elaboradoId: string): Promise<Decimal> {
    const elaborado = await this.productoService.obtener(elaboradoId);
    if (!elaborado.familiaElaboradoId || !elaborado.factorEquivalencia) {
      return new Decimal(0);
    }
    const vinculaciones = await this.familiaService.listarInsumosDe(elaborado.familiaElaboradoId);
    let costePorUnidadBase = new Decimal(0);
    for (const vinculacion of vinculaciones) {
      const insumo = await this.productoService.obtener(vinculacion.insumoId);
      costePorUnidadBase = costePorUnidadBase.plus(insumo.costeUnitarioActual);
    }
    return costePorUnidadBase.times(elaborado.factorEquivalencia).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  // Única acción manual del ciclo de un insumo: si había un lote activo, lo cierra (asienta su
  // coste exacto y actualiza la media histórica) antes de abrir el nuevo.
  public async iniciarUsoLote(loteId: string, fecha: Date): Promise<RecepcionStock> {
    const lote = await this.recepcionStockService.obtener(loteId);
    const loteAnterior = await this.recepcionStockService.loteActivo(lote.productoId);
    if (loteAnterior) {
      await this.cerrarLote(loteAnterior, fecha);
    }
    return this.recepcionStockService.iniciarUso(loteId, fecha);
  }

  private async cerrarLote(lote: RecepcionStock, fechaCierre: Date): Promise<void> {
    // Defensivo: si loteActivo() ya devolviera un lote marcado `cerrado` (no debería, lo
    // filtra), nunca lo cerramos dos veces — cerrar duplicaría su coste ya reconocido.
    if (lote.cerrado) {
      return;
    }
    const familiaId = await this.familiaService.familiaDeInsumo(lote.productoId);
    if (!familiaId) {
      // Insumo sin familia vinculada — no hay a quién atribuirle el coste. Se marca cerrado
      // igualmente (sin asiento) para que no vuelva a "reaparecer" como activo si se borra el
      // lote que lo sucedió — ver loteActivo().
      await this.recepcionStockService.marcarCierre(lote.id, null);
      return;
    }
    const variantes = (await this.productoService.listar()).filter((p) => p.familiaElaboradoId === familiaId);
    const ventas = await this.ventaBarRepository.findAll({ desde: lote.fechaInicioUso!, hasta: fechaCierre });

    const unidadesPorVariante = new Map<string, number>();
    for (const venta of ventas) {
      for (const linea of venta.lineas) {
        if (variantes.some((v) => v.id === linea.productoId)) {
          unidadesPorVariante.set(linea.productoId, (unidadesPorVariante.get(linea.productoId) ?? 0) + linea.cantidad);
        }
      }
    }

    const unidadesEquivalentesTotal = variantes.reduce((suma, v) => {
      const cantidad = unidadesPorVariante.get(v.id) ?? 0;
      return suma.plus((v.factorEquivalencia ?? new Decimal(1)).times(cantidad));
    }, new Decimal(0));

    if (unidadesEquivalentesTotal.lessThanOrEqualTo(0)) {
      // Nada se vendió durante la ventana de este lote — nada que reconocer ni que promediar,
      // pero se marca cerrado igualmente (mismo motivo que el caso sin familia, arriba).
      await this.recepcionStockService.marcarCierre(lote.id, null);
      return;
    }

    const costePorUnidadBase = lote.baseImponible.dividedBy(unidadesEquivalentesTotal).toDecimalPlaces(4, Decimal.ROUND_HALF_UP);

    const journalEntryId = await this.postearCierre(lote, variantes, unidadesPorVariante, costePorUnidadBase, fechaCierre);
    await this.recepcionStockService.marcarCierre(lote.id, journalEntryId);
    await this.productoService.registrarCierreLoteInsumo(lote.productoId, unidadesEquivalentesTotal, costePorUnidadBase);
  }

  private async postearCierre(
    lote: RecepcionStock,
    variantes: Producto[],
    unidadesPorVariante: Map<string, number>,
    costePorUnidadBase: Decimal,
    fechaCierre: Date,
  ): Promise<string> {
    const cuentaCoste = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_COSTE_PRODUCTO_VENDIDO);
    const cuentaStock = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_STOCK);

    const variantesConVentas = variantes.filter((v) => (unidadesPorVariante.get(v.id) ?? 0) > 0);
    const lines: JournalLine[] = [];
    let repartido = new Decimal(0);
    variantesConVentas.forEach((variante, indice) => {
      const cantidad = unidadesPorVariante.get(variante.id)!;
      // El último absorbe el resto del reparto, para cuadrar céntimo a céntimo con
      // lote.baseImponible pese al redondeo de cada contribución individual.
      const monto =
        indice === variantesConVentas.length - 1
          ? lote.baseImponible.minus(repartido)
          : (variante.factorEquivalencia ?? new Decimal(1))
              .times(costePorUnidadBase)
              .times(cantidad)
              .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      repartido = repartido.plus(monto);
      lines.push(
        new JournalLine({ account: cuentaCoste, debit: monto, dimensions: { productoId: variante.id } }),
      );
    });
    lines.push(
      new JournalLine({ account: cuentaStock, credit: lote.baseImponible, dimensions: { productoId: lote.productoId } }),
    );

    const journalEntryId = randomUUID();
    await this.accountingService.post(
      new JournalEntry({
        id: journalEntryId,
        date: fechaCierre,
        description: `Cierre de lote de insumo (consumo reconocido)`,
        lines,
      }),
    );
    return journalEntryId;
  }
}
