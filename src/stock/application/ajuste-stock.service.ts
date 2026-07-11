import { randomUUID } from 'crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { AjusteStock } from '../domain/ajuste-stock';
import { TipoAjusteStock } from '../domain/tipo-ajuste-stock';
import { TipoProducto } from '../domain/tipo-producto';
import { conSegundosDelMomento } from './con-segundos-del-momento';
import { AJUSTE_STOCK_REPOSITORY } from './ajuste-stock.repository';
import type { AjusteStockRepository } from './ajuste-stock.repository';
import { ProductoService } from './producto.service';
import { AccountingService } from '../../accounting/application/accounting.service';
import { JournalEntry } from '../../accounting/domain/journal-entry';
import { JournalLine, JournalLineDimensions } from '../../accounting/domain/journal-line';

const CUENTA_STOCK = '300001';
const CUENTA_CONSUMO_MERMAS = '606001';

export interface DatosAjusteStock {
  tipo: TipoAjusteStock;
  cantidad: number;
  fecha: Date;
  plazaId?: string;
  fechaId?: string;
  paseId?: string;
}

export interface CrearAjusteStockParams extends DatosAjusteStock {
  productoId: string;
}

@Injectable()
export class AjusteStockService {
  constructor(
    @Inject(AJUSTE_STOCK_REPOSITORY) private readonly repository: AjusteStockRepository,
    private readonly productoService: ProductoService,
    private readonly accountingService: AccountingService,
  ) {}

  public async crear(params: CrearAjusteStockParams): Promise<AjusteStock> {
    params = { ...params, fecha: conSegundosDelMomento(params.fecha) };
    const { journalEntryId, costeUnitarioAplicado } = await this.postearAsiento(params.productoId, params);

    const ajuste = new AjusteStock(
      randomUUID(),
      params.productoId,
      params.tipo,
      params.cantidad,
      costeUnitarioAplicado,
      journalEntryId,
      params.fecha,
      params.plazaId,
      params.fechaId,
      params.paseId,
    );
    await this.repository.save(ajuste);
    await this.productoService.recalcularDesdeHistorial(params.productoId);
    return ajuste;
  }

  public async actualizar(id: string, params: DatosAjusteStock): Promise<AjusteStock> {
    params = { ...params, fecha: conSegundosDelMomento(params.fecha) };
    const anterior = await this.buscarOFallar(id);
    await this.accountingService.eliminarAsiento(anterior.journalEntryId);

    const { journalEntryId, costeUnitarioAplicado } = await this.postearAsiento(anterior.productoId, params);

    // fecha viene siempre de params — editable a propósito, igual que en RecepcionStock.
    const actualizado = new AjusteStock(
      anterior.id,
      anterior.productoId,
      params.tipo,
      params.cantidad,
      costeUnitarioAplicado,
      journalEntryId,
      params.fecha,
      params.plazaId,
      params.fechaId,
      params.paseId,
    );
    await this.repository.save(actualizado);
    await this.productoService.recalcularDesdeHistorial(anterior.productoId);
    return actualizado;
  }

  public async eliminar(id: string): Promise<void> {
    const ajuste = await this.buscarOFallar(id);
    await this.accountingService.eliminarAsiento(ajuste.journalEntryId);
    await this.repository.delete(id);
    await this.productoService.recalcularDesdeHistorial(ajuste.productoId);
  }

  public async listar(productoId?: string): Promise<AjusteStock[]> {
    return this.repository.findAll(productoId);
  }

  public async obtener(id: string): Promise<AjusteStock> {
    return this.buscarOFallar(id);
  }

  private async postearAsiento(
    productoId: string,
    params: DatosAjusteStock,
  ): Promise<{ journalEntryId: string; costeUnitarioAplicado: Decimal }> {
    const producto = await this.productoService.obtener(productoId);
    if (producto.tipo !== TipoProducto.VENTA_DIRECTA) {
      throw new BadRequestException(
        'Los ajustes de stock solo aplican a productos de venta directa — un INSUMO se consume vía su ciclo de lotes, y un ELABORADO no tiene stock propio',
      );
    }
    const costeUnitarioAplicado = producto.costeUnitarioActual;
    if (costeUnitarioAplicado.isZero()) {
      throw new BadRequestException(
        'Este producto no tiene coste registrado todavía — regístrale una recepción de stock primero',
      );
    }
    const importe = new Decimal(params.cantidad).times(costeUnitarioAplicado);

    const cuentaConsumo = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_CONSUMO_MERMAS);
    const cuentaStock = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_STOCK);
    const dimensiones: JournalLineDimensions = {
      plazaId: params.plazaId,
      fechaId: params.fechaId,
      paseId: params.paseId,
      productoId,
    };

    const journalEntryId = randomUUID();
    await this.accountingService.post(
      new JournalEntry({
        id: journalEntryId,
        date: params.fecha,
        description: `Ajuste de stock (${params.tipo}): ${producto.nombre}`,
        lines: [
          new JournalLine({ account: cuentaConsumo, debit: importe, dimensions: dimensiones }),
          new JournalLine({ account: cuentaStock, credit: importe, dimensions: dimensiones }),
        ],
      }),
    );

    return { journalEntryId, costeUnitarioAplicado };
  }

  private async buscarOFallar(id: string): Promise<AjusteStock> {
    const ajuste = await this.repository.findById(id);
    if (!ajuste) {
      throw new NotFoundException('Ajuste de stock no encontrado');
    }
    return ajuste;
  }
}
