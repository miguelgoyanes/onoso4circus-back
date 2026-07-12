import { randomUUID } from 'crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { VentaBar, VentaBarLinea } from '../domain/venta-bar';
import { TipoFiscal } from '../domain/tipo-fiscal';
import { VENTA_BAR_REPOSITORY, VentaBarFilter } from './venta-bar.repository';
import type { VentaBarRepository } from './venta-bar.repository';
import { ProductoService } from '../../stock/application/producto.service';
import { TipoProducto } from '../../stock/domain/tipo-producto';
import { CosteElaboradoService } from './coste-elaborado.service';
import { PaseService } from '../../plazas/application/pase.service';
import { FechaService } from '../../plazas/application/fecha.service';
import { AccountingService } from '../../accounting/application/accounting.service';
import { JournalEntry } from '../../accounting/domain/journal-entry';
import { JournalLine, JournalLineDimensions } from '../../accounting/domain/journal-line';
import { UNIT_OF_WORK } from '../../accounting/application/unit-of-work';
import type { UnitOfWork } from '../../accounting/application/unit-of-work';
import { ResumenPorTipoFiscal } from './resumen-tipo-fiscal';
import { CandidatosParaImporte, buscarCandidatosParaImporte } from './candidatos-por-importe';

const CUENTA_INGRESOS_BAR = '701001';
const CUENTA_COSTE_PRODUCTO_VENDIDO = '600001';
const CUENTA_STOCK_BAR = '300001';
const CUENTA_IVA_REPERCUTIDO = '477001';

export interface LineaPedidoInput {
  productoId: string;
  cantidad: number;
}

interface AsientoPedido {
  lines: JournalLine[];
  total: Decimal;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: Decimal;
  baseImponible?: Decimal;
  importeIva?: Decimal;
}

@Injectable()
export class VentaBarService {
  constructor(
    @Inject(VENTA_BAR_REPOSITORY) private readonly repository: VentaBarRepository,
    private readonly productoService: ProductoService,
    private readonly costeElaboradoService: CosteElaboradoService,
    private readonly paseService: PaseService,
    private readonly fechaService: FechaService,
    private readonly accountingService: AccountingService,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
  ) {}

  // tipoFiscal/ivaPercent son opcionales — el registro rápido in situ (BarRegistrarVentaPage)
  // nunca los manda (el IVA se gestiona después, vía reclasificarLote); el registro
  // retroactivo en modal (BarPasePage) sí los manda directamente en el momento de crear.
  public async crear(
    paseId: string,
    cuentaCobroId: string,
    lineasInput: LineaPedidoInput[],
    tipoFiscal?: TipoFiscal,
    ivaPercent?: number,
  ): Promise<VentaBar> {
    if (!lineasInput.length) {
      throw new BadRequestException('lineas no puede estar vacío');
    }
    const pase = await this.paseService.obtener(paseId);
    const fechaEntidad = await this.fechaService.obtener(pase.fechaId);
    const dimensiones: JournalLineDimensions = { plazaId: fechaEntidad.plazaId, fechaId: fechaEntidad.id, paseId };

    const lineas = await this.snapshotearLineas(lineasInput);
    await this.aplicarStock(lineas, -1);

    const asiento = await this.construirAsiento(lineas, cuentaCobroId, tipoFiscal, ivaPercent, dimensiones);
    const journalEntryId = randomUUID();
    await this.accountingService.post(
      new JournalEntry({
        id: journalEntryId,
        date: fechaEntidad.fecha,
        description: `Venta de bar (${lineas.length} producto/s)`,
        lines: asiento.lines,
      }),
    );

    const venta = new VentaBar({
      id: randomUUID(),
      paseId,
      fechaId: fechaEntidad.id,
      plazaId: fechaEntidad.plazaId,
      cuentaCobroId,
      creadoEn: new Date(),
      lineas,
      importeTotal: asiento.total,
      tipoFiscal: asiento.tipoFiscal,
      ivaPercent: asiento.ivaPercent,
      baseImponible: asiento.baseImponible,
      importeIva: asiento.importeIva,
      journalEntryId,
    });
    await this.repository.save(venta);
    return venta;
  }

  // Corrige las líneas/cuenta de un pedido ya registrado (ej. "eran dos Coca-Colas, no
  // una") — conserva el tipoFiscal/ivaPercent que ya tuviera el pedido (si estaba
  // reclasificado a A, se recalcula la base sobre el importeTotal nuevo con el mismo %).
  public async actualizar(id: string, cuentaCobroId: string, lineasInput: LineaPedidoInput[]): Promise<VentaBar> {
    if (!lineasInput.length) {
      throw new BadRequestException('lineas no puede estar vacío');
    }
    const anterior = await this.buscarOFallar(id);
    await this.accountingService.eliminarAsiento(anterior.journalEntryId);
    await this.aplicarStock(anterior.lineas, 1);

    const pase = await this.paseService.obtener(anterior.paseId);
    const fechaEntidad = await this.fechaService.obtener(pase.fechaId);
    const dimensiones: JournalLineDimensions = {
      plazaId: fechaEntidad.plazaId,
      fechaId: fechaEntidad.id,
      paseId: anterior.paseId,
    };

    const lineas = await this.snapshotearLineas(lineasInput);
    await this.aplicarStock(lineas, -1);

    const asiento = await this.construirAsiento(
      lineas,
      cuentaCobroId,
      anterior.tipoFiscal,
      anterior.ivaPercent?.toNumber(),
      dimensiones,
    );
    const journalEntryId = randomUUID();
    await this.accountingService.post(
      new JournalEntry({
        id: journalEntryId,
        date: fechaEntidad.fecha,
        description: `Venta de bar (${lineas.length} producto/s)`,
        lines: asiento.lines,
      }),
    );

    const actualizada = anterior.actualizada({
      cuentaCobroId,
      lineas,
      importeTotal: asiento.total,
      tipoFiscal: asiento.tipoFiscal,
      ivaPercent: asiento.ivaPercent,
      baseImponible: asiento.baseImponible,
      importeIva: asiento.importeIva,
      journalEntryId,
    });
    await this.repository.save(actualizada);
    return actualizada;
  }

  // Nunca toca el stock ni las líneas — solo revierte y reaplica el asiento preservando
  // importeTotal, igual que VentaEntradasService.reclasificarLote. Todo el lote va en una
  // única transacción (UnitOfWork): si falla a mitad, no queda ningún id reclasificado a
  // medias — o se reclasifican todos, o ninguno.
  public async reclasificarLote(ids: string[], tipoFiscal: TipoFiscal, ivaPercent?: number): Promise<VentaBar[]> {
    return this.unitOfWork.run(async (manager) => {
      const resultado: VentaBar[] = [];
      for (const id of ids) {
        const venta = await this.buscarOFallar(id);
        await this.accountingService.eliminarAsiento(venta.journalEntryId, manager);

        const pase = await this.paseService.obtener(venta.paseId);
        const fechaEntidad = await this.fechaService.obtener(pase.fechaId);
        const dimensiones: JournalLineDimensions = {
          plazaId: fechaEntidad.plazaId,
          fechaId: fechaEntidad.id,
          paseId: venta.paseId,
        };

        const asiento = await this.construirAsiento(venta.lineas, venta.cuentaCobroId, tipoFiscal, ivaPercent, dimensiones);
        const journalEntryId = randomUUID();
        await this.accountingService.post(
          new JournalEntry({
            id: journalEntryId,
            date: fechaEntidad.fecha,
            description: `Venta de bar (${venta.lineas.length} producto/s)`,
            lines: asiento.lines,
          }),
          manager,
        );

        const actualizada = venta.actualizada({
          cuentaCobroId: venta.cuentaCobroId,
          lineas: venta.lineas,
          importeTotal: asiento.total,
          tipoFiscal: asiento.tipoFiscal,
          ivaPercent: asiento.ivaPercent,
          baseImponible: asiento.baseImponible,
          importeIva: asiento.importeIva,
          journalEntryId,
        });
        await this.repository.save(actualizada, manager);
        resultado.push(actualizada);
      }
      return resultado;
    });
  }

  public async eliminar(id: string): Promise<void> {
    const venta = await this.buscarOFallar(id);
    await this.accountingService.eliminarAsiento(venta.journalEntryId);
    await this.aplicarStock(venta.lineas, 1);
    await this.repository.delete(id);
  }

  public async listar(filter?: VentaBarFilter): Promise<VentaBar[]> {
    return this.repository.findAll(filter);
  }

  public async contarEnRango(desde: Date, hasta: Date): Promise<number> {
    return this.repository.contarEnRango(desde, hasta);
  }

  // Para el módulo de reclasificación de IVA: cuánto hay ya declarado (A, con su base/IVA) y
  // cuánto sigue sin declarar (B) en un periodo. "Sin clasificar" (tipoFiscal undefined, el
  // caso normal de una venta recién creada por el flujo táctil) cuenta como B — mismo
  // criterio que ya usa la UI (`pedido.tipoFiscal ?? 'B'` en BarPasePage).
  public async resumenPorTipoFiscal(desde: Date, hasta: Date): Promise<ResumenPorTipoFiscal> {
    const ventas = await this.repository.listarEnRangoReal(desde, hasta);
    let totalA = new Decimal(0);
    let baseA = new Decimal(0);
    let ivaA = new Decimal(0);
    let countA = 0;
    let totalB = new Decimal(0);
    let countB = 0;

    for (const venta of ventas) {
      if (venta.tipoFiscal === TipoFiscal.A) {
        totalA = totalA.plus(venta.importeTotal);
        baseA = baseA.plus(venta.baseImponible ?? venta.importeTotal);
        ivaA = ivaA.plus(venta.importeIva ?? new Decimal(0));
        countA += 1;
      } else {
        totalB = totalB.plus(venta.importeTotal);
        countB += 1;
      }
    }

    return { totalA, baseA, ivaA, countA, totalB, countB };
  }

  // Solo lectura — no muta nada. Devuelve qué ids reclasificar para acercarse al importe
  // objetivo; el llamador confirma pasando esos ids exactos a reclasificarLote.
  public async buscarCandidatosParaImporte(
    desde: Date,
    hasta: Date,
    origen: TipoFiscal,
    importeObjetivo: Decimal,
  ): Promise<CandidatosParaImporte> {
    const ventas = await this.repository.listarEnRangoReal(desde, hasta);
    const pool = ventas.filter((v) => (origen === TipoFiscal.A ? v.tipoFiscal === TipoFiscal.A : v.tipoFiscal !== TipoFiscal.A));
    return buscarCandidatosParaImporte(pool, (v) => v.importeTotal, importeObjetivo);
  }

  public async obtener(id: string): Promise<VentaBar> {
    return this.buscarOFallar(id);
  }

  private async snapshotearLineas(lineasInput: LineaPedidoInput[]): Promise<VentaBarLinea[]> {
    const lineas: VentaBarLinea[] = [];
    for (const l of lineasInput) {
      if (l.cantidad <= 0) {
        throw new BadRequestException('cantidad debe ser mayor que 0');
      }
      const producto = await this.productoService.obtener(l.productoId);
      // ELABORADO (ej. palomitas): este coste es solo informativo (media histórica sobre
      // lotes de insumo ya cerrados) — nunca se asienta en el momento de la venta, ver
      // construirAsiento. El coste real se reconoce, exacto, al cerrar el lote de insumo.
      const costeUnitario =
        producto.tipo === TipoProducto.ELABORADO
          ? await this.costeElaboradoService.costeAproximado(l.productoId)
          : producto.costeUnitarioActual;
      lineas.push(new VentaBarLinea(l.productoId, l.cantidad, producto.precioVentaPublico, costeUnitario));
    }
    return lineas;
  }

  // signo -1 al vender (consume stock), +1 al revertir una venta editada o eliminada
  // (repone). Deja el coste medio ponderado intacto — una venta nunca lo altera. Un
  // ELABORADO no tiene cantidadActual/stock propio — nada que ajustar.
  private async aplicarStock(lineas: VentaBarLinea[], signo: 1 | -1): Promise<void> {
    for (const l of lineas) {
      const producto = await this.productoService.obtener(l.productoId);
      if (producto.tipo === TipoProducto.ELABORADO) {
        continue;
      }
      await this.productoService.ajustarCantidadPorVenta(l.productoId, signo * l.cantidad);
    }
  }

  private async construirAsiento(
    lineas: VentaBarLinea[],
    cuentaCobroId: string,
    tipoFiscal: TipoFiscal | undefined,
    ivaPercent: number | undefined,
    dimensionesBase: JournalLineDimensions,
  ): Promise<AsientoPedido> {
    const cuentaCoste = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_COSTE_PRODUCTO_VENDIDO);
    const cuentaStock = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_STOCK_BAR);
    const cuentaIngresos = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_INGRESOS_BAR);
    const cuentaCobro = await this.accountingService.obtenerCuentaPorId(cuentaCobroId);

    const lines: JournalLine[] = [];
    let total = new Decimal(0);
    for (const linea of lineas) {
      const dimensionesLinea: JournalLineDimensions = { ...dimensionesBase, productoId: linea.productoId };
      const subtotalPrecio = linea.precioUnitarioAplicado.times(linea.cantidad).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      total = total.plus(subtotalPrecio);

      const producto = await this.productoService.obtener(linea.productoId);
      // Un ELABORADO nunca asienta coste en el momento de la venta — no se sabe con certeza
      // hasta que se cierra el lote de insumo (ver CosteElaboradoService.iniciarUsoLote), que
      // es cuando se reconoce exacto de una sola vez. costeUnitarioAplicado aquí es solo el
      // valor aproximado snapshoteado para mostrar en el histórico del pedido.
      if (producto.tipo === TipoProducto.ELABORADO) {
        continue;
      }

      const subtotalCoste = linea.costeUnitarioAplicado.times(linea.cantidad).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      // Si el producto todavía no tiene coste establecido (nunca ha tenido recepción), no hay
      // nada que asentar como coste — JournalLine rechaza una línea con debit y credit a
      // cero. No bloquea la venta, solo omite el par de coste.
      if (subtotalCoste.isZero()) {
        continue;
      }
      lines.push(new JournalLine({ account: cuentaCoste, debit: subtotalCoste, dimensions: dimensionesLinea }));
      lines.push(new JournalLine({ account: cuentaStock, credit: subtotalCoste, dimensions: dimensionesLinea }));
    }

    let resto: Pick<AsientoPedido, 'tipoFiscal' | 'ivaPercent' | 'baseImponible' | 'importeIva'>;
    if (tipoFiscal === TipoFiscal.A) {
      if (ivaPercent == null) {
        throw new BadRequestException('ivaPercent es obligatorio cuando tipoFiscal = A');
      }
      const ivaPercentDec = new Decimal(ivaPercent);
      const baseImponible = total
        .dividedBy(new Decimal(1).plus(ivaPercentDec.dividedBy(100)))
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      // Complemento exacto, no base×%, para garantizar base + iva === total céntimo a
      // céntimo (mismo criterio que VentaEntradasService).
      const importeIva = total.minus(baseImponible);
      lines.push(new JournalLine({ account: cuentaIngresos, credit: baseImponible, dimensions: dimensionesBase }));
      const cuentaIva = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_IVA_REPERCUTIDO);
      lines.push(new JournalLine({ account: cuentaIva, credit: importeIva, dimensions: dimensionesBase }));
      resto = { tipoFiscal: TipoFiscal.A, ivaPercent: ivaPercentDec, baseImponible, importeIva };
    } else {
      lines.push(new JournalLine({ account: cuentaIngresos, credit: total, dimensions: dimensionesBase }));
      resto =
        tipoFiscal === TipoFiscal.B
          ? { tipoFiscal: TipoFiscal.B, ivaPercent: new Decimal(0), baseImponible: total, importeIva: new Decimal(0) }
          : {};
    }

    lines.push(new JournalLine({ account: cuentaCobro, debit: total, dimensions: dimensionesBase }));
    return { lines, total, ...resto };
  }

  private async buscarOFallar(id: string): Promise<VentaBar> {
    const venta = await this.repository.findById(id);
    if (!venta) {
      throw new NotFoundException('Venta de bar no encontrada');
    }
    return venta;
  }
}
