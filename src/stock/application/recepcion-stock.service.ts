import { randomUUID } from 'crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { RecepcionStock } from '../domain/recepcion-stock';
import { TipoFiscal } from '../domain/tipo-fiscal';
import { conSegundosDelMomento } from './con-segundos-del-momento';
import { RECEPCION_STOCK_REPOSITORY } from './recepcion-stock.repository';
import type { RecepcionStockRepository } from './recepcion-stock.repository';
import { ProductoService } from './producto.service';
import { AccountingService } from '../../accounting/application/accounting.service';
import { JournalEntry } from '../../accounting/domain/journal-entry';
import { JournalLine, JournalLineDimensions } from '../../accounting/domain/journal-line';

const CUENTA_STOCK = '300001';
const CUENTA_IVA_SOPORTADO = '472001';

export interface DatosRecepcionStock {
  cantidad: number;
  fecha: Date;
  cuentaOrigenId: string;
  plazaId?: string;
  tipoFiscal?: TipoFiscal;
  // tipoFiscal = B (o no indicado): coste unitario tal cual, sin IVA.
  costeUnitario?: number;
  // tipoFiscal = A: base imponible TOTAL de la recepción (no por unidad) + % — el backend
  // deriva el resto, nunca confía en un total que mande el cliente (mismo criterio que Gasto).
  ivaPercent?: number;
  baseImponible?: number;
}

export interface CrearRecepcionStockParams extends DatosRecepcionStock {
  productoId: string;
}

interface RepartoIva {
  baseImponible: Decimal;
  ivaPercent: Decimal;
  importeIva: Decimal;
  importeTotal: Decimal;
}

interface AsientoRecepcion {
  costeUnitario: Decimal;
  baseImponible: Decimal;
  importeTotal: Decimal;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: Decimal;
  importeIva?: Decimal;
  journalEntryId: string;
}

@Injectable()
export class RecepcionStockService {
  constructor(
    @Inject(RECEPCION_STOCK_REPOSITORY) private readonly repository: RecepcionStockRepository,
    private readonly productoService: ProductoService,
    private readonly accountingService: AccountingService,
  ) {}

  public async crear(params: CrearRecepcionStockParams): Promise<RecepcionStock> {
    params = { ...params, fecha: conSegundosDelMomento(params.fecha) };
    const producto = await this.productoService.obtener(params.productoId);
    const asiento = await this.postearAsiento(params.productoId, producto.nombre, params);

    const recepcion = new RecepcionStock({
      id: randomUUID(),
      productoId: params.productoId,
      cantidad: params.cantidad,
      fecha: params.fecha,
      cuentaOrigenId: params.cuentaOrigenId,
      plazaId: params.plazaId,
      ...asiento,
    });
    await this.repository.save(recepcion);
    await this.productoService.recalcularDesdeHistorial(params.productoId);
    return recepcion;
  }

  public async actualizar(id: string, params: DatosRecepcionStock): Promise<RecepcionStock> {
    params = { ...params, fecha: conSegundosDelMomento(params.fecha) };
    const anterior = await this.buscarOFallar(id);
    const producto = await this.productoService.obtener(anterior.productoId);

    await this.accountingService.eliminarAsiento(anterior.journalEntryId);
    const asiento = await this.postearAsiento(anterior.productoId, producto.nombre, params);

    // fecha viene siempre de params — es editable a propósito, para poder reubicar un
    // movimiento en el punto exacto del historial en el que ocurrió de verdad.
    const actualizada = new RecepcionStock({
      id: anterior.id,
      productoId: anterior.productoId,
      cantidad: params.cantidad,
      fecha: params.fecha,
      cuentaOrigenId: params.cuentaOrigenId,
      plazaId: params.plazaId,
      ...asiento,
    });
    await this.repository.save(actualizada);
    await this.productoService.recalcularDesdeHistorial(anterior.productoId);
    return actualizada;
  }

  public async eliminar(id: string): Promise<void> {
    const recepcion = await this.buscarOFallar(id);
    await this.accountingService.eliminarAsiento(recepcion.journalEntryId);
    await this.repository.delete(id);
    await this.productoService.recalcularDesdeHistorial(recepcion.productoId);
  }

  public async listar(productoId?: string): Promise<RecepcionStock[]> {
    return this.repository.findAll(productoId);
  }

  public async obtener(id: string): Promise<RecepcionStock> {
    return this.buscarOFallar(id);
  }

  private async postearAsiento(
    productoId: string,
    productoNombre: string,
    params: DatosRecepcionStock,
  ): Promise<AsientoRecepcion> {
    const tipoFiscal = params.tipoFiscal ?? TipoFiscal.B;

    let costeUnitario: Decimal;
    let baseImponible: Decimal;
    let importeTotal: Decimal;
    let ivaPercent: Decimal | undefined;
    let importeIva: Decimal | undefined;

    if (tipoFiscal === TipoFiscal.A) {
      const reparto = this.calcularReparto(params.baseImponible, params.ivaPercent);
      baseImponible = reparto.baseImponible;
      ivaPercent = reparto.ivaPercent;
      importeIva = reparto.importeIva;
      importeTotal = reparto.importeTotal;
      costeUnitario = baseImponible.dividedBy(params.cantidad).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    } else {
      if (params.costeUnitario == null) {
        throw new BadRequestException('costeUnitario es obligatorio cuando tipoFiscal = B');
      }
      costeUnitario = new Decimal(params.costeUnitario);
      baseImponible = costeUnitario.times(params.cantidad);
      importeTotal = baseImponible;
    }

    const cuentaStock = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_STOCK);
    const cuentaOrigen = await this.accountingService.obtenerCuentaPorId(params.cuentaOrigenId);
    const dimensiones: JournalLineDimensions = { plazaId: params.plazaId, productoId };

    const lines: JournalLine[] = [
      new JournalLine({ account: cuentaStock, debit: baseImponible, dimensions: dimensiones }),
    ];
    if (tipoFiscal === TipoFiscal.A) {
      const cuentaIva = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_IVA_SOPORTADO);
      lines.push(new JournalLine({ account: cuentaIva, debit: importeIva!, dimensions: dimensiones }));
    }
    lines.push(new JournalLine({ account: cuentaOrigen, credit: importeTotal, dimensions: dimensiones }));

    const journalEntryId = randomUUID();
    await this.accountingService.post(
      new JournalEntry({
        id: journalEntryId,
        date: params.fecha,
        description: `Recepción de stock: ${productoNombre}`,
        lines,
      }),
    );

    return {
      costeUnitario,
      baseImponible,
      importeTotal,
      tipoFiscal: tipoFiscal === TipoFiscal.A ? tipoFiscal : undefined,
      ivaPercent,
      importeIva,
      journalEntryId,
    };
  }

  private calcularReparto(baseImponibleInput?: number, ivaPercentInput?: number): RepartoIva {
    if (baseImponibleInput == null || ivaPercentInput == null) {
      throw new BadRequestException('baseImponible e ivaPercent son obligatorios cuando tipoFiscal = A');
    }
    const baseImponible = new Decimal(baseImponibleInput);
    const ivaPercent = new Decimal(ivaPercentInput);
    const importeIva = baseImponible.times(ivaPercent).dividedBy(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const importeTotal = baseImponible.plus(importeIva);
    return { baseImponible, ivaPercent, importeIva, importeTotal };
  }

  private async buscarOFallar(id: string): Promise<RecepcionStock> {
    const recepcion = await this.repository.findById(id);
    if (!recepcion) {
      throw new NotFoundException('Recepción de stock no encontrada');
    }
    return recepcion;
  }
}
