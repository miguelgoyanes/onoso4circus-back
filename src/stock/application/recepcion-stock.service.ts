import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { RecepcionStock } from '../domain/recepcion-stock';
import { TipoFiscal } from '../domain/tipo-fiscal';
import { TipoProducto } from '../domain/tipo-producto';
import { UnidadMedida } from '../domain/unidad-medida';
import { EstadoPagoRecepcion } from '../domain/estado-pago-recepcion';
import { conSegundosDelMomento } from './con-segundos-del-momento';
import { RECEPCION_STOCK_REPOSITORY } from './recepcion-stock.repository';
import type { RecepcionStockRepository } from './recepcion-stock.repository';
import { ProductoService } from './producto.service';
import { AccountingService } from '../../accounting/application/accounting.service';
import { fechaContableDeHoy, JournalEntry } from '../../accounting/domain/journal-entry';
import { JournalLine, JournalLineDimensions } from '../../accounting/domain/journal-line';

const CUENTA_STOCK = '300001';
const CUENTA_IVA_SOPORTADO = '472001';
const CUENTA_PROVEEDORES_STOCK = '400002';

export interface DatosRecepcionStock {
  cantidad: number;
  fecha: Date;
  // Solo obligatoria cuando estadoPago = PAGADO (o no indicado) — ver postearAsiento.
  cuentaOrigenId?: string;
  estadoPago?: EstadoPagoRecepcion;
  plazaId?: string;
  tipoFiscal?: TipoFiscal;
  // tipoFiscal = B (o no indicado): coste unitario tal cual, sin IVA.
  costeUnitario?: number;
  // tipoFiscal = A: base imponible TOTAL de la recepción (no por unidad) + % — el backend
  // deriva el resto, nunca confía en un total que mande el cliente (mismo criterio que Gasto).
  ivaPercent?: number;
  baseImponible?: number;
  // Solo para INSUMO — cantidad física comprada (ej. 15), puramente informativa.
  cantidadMedida?: number;
  unidadMedida?: UnidadMedida;
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
  estadoPago: EstadoPagoRecepcion;
  cuentaOrigenId?: string;
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
    this.validarTipoParaRecepcion(producto.tipo, params.cantidad);
    const asiento = await this.postearAsiento(params.productoId, producto.nombre, params);

    const recepcion = new RecepcionStock({
      id: randomUUID(),
      productoId: params.productoId,
      cantidad: params.cantidad,
      fecha: params.fecha,
      plazaId: params.plazaId,
      cantidadMedida: params.cantidadMedida != null ? new Decimal(params.cantidadMedida) : undefined,
      unidadMedida: params.unidadMedida,
      ...asiento,
    });
    await this.repository.save(recepcion);
    await this.productoService.recalcularDesdeHistorial(params.productoId);
    return recepcion;
  }

  public async actualizar(id: string, params: DatosRecepcionStock): Promise<RecepcionStock> {
    params = { ...params, fecha: conSegundosDelMomento(params.fecha) };
    const anterior = await this.buscarOFallar(id);
    this.validarNoCerrado(anterior);
    const producto = await this.productoService.obtener(anterior.productoId);
    this.validarTipoParaRecepcion(producto.tipo, params.cantidad);

    await this.accountingService.eliminarAsiento(anterior.journalEntryId);
    // Si ya se había pagado una recepción que se creó pendiente, ese asiento de liquidación
    // también se revierte — el repost de abajo colapsa todo al estado actual en un único
    // asiento nuevo, igual que Gasto.actualizar().
    if (anterior.pagoJournalEntryId) {
      await this.accountingService.eliminarAsiento(anterior.pagoJournalEntryId);
    }
    const asiento = await this.postearAsiento(anterior.productoId, producto.nombre, params);

    // fecha viene siempre de params — es editable a propósito, para poder reubicar un
    // movimiento en el punto exacto del historial en el que ocurrió de verdad.
    const actualizada = new RecepcionStock({
      id: anterior.id,
      productoId: anterior.productoId,
      cantidad: params.cantidad,
      fecha: params.fecha,
      plazaId: params.plazaId,
      cantidadMedida: params.cantidadMedida != null ? new Decimal(params.cantidadMedida) : undefined,
      unidadMedida: params.unidadMedida,
      // fechaInicioUso no se toca al editar cantidad/coste — es un estado aparte que solo
      // cambia vía iniciarUso().
      fechaInicioUso: anterior.fechaInicioUso,
      ...asiento,
    });
    await this.repository.save(actualizada);
    await this.productoService.recalcularDesdeHistorial(anterior.productoId);
    return actualizada;
  }

  public async eliminar(id: string): Promise<void> {
    const recepcion = await this.buscarOFallar(id);
    this.validarNoCerrado(recepcion);
    await this.accountingService.eliminarAsiento(recepcion.journalEntryId);
    if (recepcion.pagoJournalEntryId) {
      await this.accountingService.eliminarAsiento(recepcion.pagoJournalEntryId);
    }
    await this.repository.delete(id);
    await this.productoService.recalcularDesdeHistorial(recepcion.productoId);
  }

  // Liquida una recepción creada/editada como PENDIENTE_PAGO: postea un asiento que salda
  // "Proveedores de stock" (400002) contra la cuenta real de tesorería. Mismo patrón que
  // GastoService.pagarPendiente.
  public async pagarPendiente(id: string, cuentaOrigenId: string): Promise<RecepcionStock> {
    const recepcion = await this.buscarOFallar(id);
    if (recepcion.estadoPago !== EstadoPagoRecepcion.PENDIENTE_PAGO) {
      throw new ConflictException('Esta recepción ya está pagada');
    }
    const producto = await this.productoService.obtener(recepcion.productoId);

    const cuentaProveedores = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_PROVEEDORES_STOCK);
    const cuentaOrigen = await this.accountingService.obtenerCuentaPorId(cuentaOrigenId);
    const dimensiones: JournalLineDimensions = { plazaId: recepcion.plazaId, productoId: recepcion.productoId };

    const journalEntryId = randomUUID();
    await this.accountingService.post(
      new JournalEntry({
        id: journalEntryId,
        date: fechaContableDeHoy(),
        description: `Pago de recepción pendiente: ${producto.nombre}`,
        lines: [
          new JournalLine({ account: cuentaProveedores, debit: recepcion.importeTotal, dimensions: dimensiones }),
          new JournalLine({ account: cuentaOrigen, credit: recepcion.importeTotal, dimensions: dimensiones }),
        ],
      }),
    );

    const pagada = recepcion.conPago(cuentaOrigenId, journalEntryId);
    await this.repository.save(pagada);
    return pagada;
  }

  // Un lote ya cerrado (ver CosteElaboradoService.cerrarLote) reconoció su coste en un
  // asiento exacto y actualizó la media histórica del insumo — es historia ya asentada, no
  // se puede editar ni eliminar sin dejar ese asiento huérfano (crediticando existencias de
  // un insumo cuya recepción ya no existiría). Igual que un producto con movimientos: si hace
  // falta corregir algo, se hace con un movimiento nuevo hacia delante, no borrando el pasado.
  private validarNoCerrado(lote: RecepcionStock): void {
    if (lote.cierreJournalEntryId) {
      throw new BadRequestException(
        'Este lote ya se cerró (su coste ya se asentó en contabilidad) — no se puede editar ni eliminar',
      );
    }
  }

  public async listar(productoId?: string): Promise<RecepcionStock[]> {
    return this.repository.findAll(productoId);
  }

  // Única acción manual del flujo de coste de un ELABORADO: marca cuándo se empieza a usar
  // de verdad este lote (distinto de `fecha`, que es cuándo se compró). El lote anterior del
  // mismo insumo queda "consumido" de forma derivada, sin tocarlo — ver loteActivo().
  public async iniciarUso(id: string, fechaInicioUso: Date): Promise<RecepcionStock> {
    const lote = await this.buscarOFallar(id);
    const producto = await this.productoService.obtener(lote.productoId);
    if (producto.tipo !== TipoProducto.INSUMO) {
      throw new BadRequestException('Solo los lotes de un INSUMO tienen ciclo de uso');
    }
    const actualizado = lote.conFechaInicioUso(conSegundosDelMomento(fechaInicioUso));
    await this.repository.save(actualizado);
    return actualizado;
  }

  // Llamado por CosteElaboradoService.cerrarLote (ventas) tras postear el asiento de cierre —
  // deja constancia de qué asiento reconoció el coste de este lote, o lo deja en null si se
  // cerró sin nada que reconocer (sin ventas durante su ventana).
  public async marcarCierre(id: string, cierreJournalEntryId: string | null): Promise<RecepcionStock> {
    const lote = await this.buscarOFallar(id);
    const actualizado = lote.conCierre(cierreJournalEntryId);
    await this.repository.save(actualizado);
    return actualizado;
  }

  // El lote "consumiéndose" de un insumo: el de fechaInicioUso más reciente ENTRE LOS QUE
  // TODAVÍA NO SE HAN CERRADO. Null si no hay ninguno abierto. Excluir `cerrado` importa para
  // un caso límite real: si se cierra un lote A al abrir B, y luego se borra B (nunca se cerró
  // él mismo, así que el borrado está permitido), A vuelve a ser "el de fecha más reciente"
  // aunque ya se cerró — sin este filtro, abrir un lote C lo cerraría una segunda vez,
  // duplicando su coste ya reconocido.
  public async loteActivo(insumoId: string): Promise<RecepcionStock | null> {
    const lotes = (await this.repository.findAll(insumoId)).filter(
      (l) => l.fechaInicioUso != null && !l.cerrado,
    );
    if (lotes.length === 0) {
      return null;
    }
    return lotes.reduce((masReciente, actual) =>
      actual.fechaInicioUso! > masReciente.fechaInicioUso! ? actual : masReciente,
    );
  }

  private validarTipoParaRecepcion(tipo: TipoProducto, cantidad: number): void {
    if (tipo === TipoProducto.ELABORADO) {
      throw new BadRequestException('Un ELABORADO no tiene recepciones propias, su coste se calcula solo');
    }
    if (tipo === TipoProducto.INSUMO && cantidad !== 1) {
      throw new BadRequestException('Un lote de INSUMO es siempre una unidad (el saco/garrafa entero)');
    }
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

    const estadoPago = params.estadoPago ?? EstadoPagoRecepcion.PAGADO;
    let cuentaCredito;
    if (estadoPago === EstadoPagoRecepcion.PAGADO) {
      if (!params.cuentaOrigenId) {
        throw new BadRequestException('cuentaOrigenId es obligatorio cuando estadoPago = PAGADO');
      }
      cuentaCredito = await this.accountingService.obtenerCuentaPorId(params.cuentaOrigenId);
    } else {
      cuentaCredito = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_PROVEEDORES_STOCK);
    }

    const cuentaStock = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_STOCK);
    const dimensiones: JournalLineDimensions = { plazaId: params.plazaId, productoId };

    const lines: JournalLine[] = [
      new JournalLine({ account: cuentaStock, debit: baseImponible, dimensions: dimensiones }),
    ];
    if (tipoFiscal === TipoFiscal.A) {
      const cuentaIva = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_IVA_SOPORTADO);
      lines.push(new JournalLine({ account: cuentaIva, debit: importeIva!, dimensions: dimensiones }));
    }
    lines.push(new JournalLine({ account: cuentaCredito, credit: importeTotal, dimensions: dimensiones }));

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
      estadoPago,
      cuentaOrigenId: estadoPago === EstadoPagoRecepcion.PAGADO ? params.cuentaOrigenId : undefined,
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
