import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { Producto } from '../domain/producto';
import { TipoProducto } from '../domain/tipo-producto';
import { DireccionOrden } from '../domain/direccion-orden';
import { PRODUCTO_REPOSITORY } from './producto.repository';
import type { ProductoRepository } from './producto.repository';
import { RECEPCION_STOCK_REPOSITORY } from './recepcion-stock.repository';
import type { RecepcionStockRepository } from './recepcion-stock.repository';
import { AJUSTE_STOCK_REPOSITORY } from './ajuste-stock.repository';
import type { AjusteStockRepository } from './ajuste-stock.repository';

@Injectable()
export class ProductoService {
  constructor(
    @Inject(PRODUCTO_REPOSITORY) private readonly repository: ProductoRepository,
    @Inject(RECEPCION_STOCK_REPOSITORY) private readonly recepcionRepository: RecepcionStockRepository,
    @Inject(AJUSTE_STOCK_REPOSITORY) private readonly ajusteRepository: AjusteStockRepository,
  ) {}

  public async crear(
    nombre: string,
    precioVentaPublico: Decimal,
    aplicaIva: boolean,
    tipo: TipoProducto = TipoProducto.VENTA_DIRECTA,
    familiaElaboradoId?: string,
    factorEquivalencia?: Decimal,
  ): Promise<Producto> {
    if (tipo === TipoProducto.ELABORADO && (!familiaElaboradoId || !factorEquivalencia)) {
      throw new BadRequestException('Un producto ELABORADO necesita familiaElaboradoId y factorEquivalencia');
    }
    // Se añade al final del orden manual — un producto nuevo no debe colarse entre los
    // que Brandon ya ha colocado a su gusto.
    const siguienteOrden = (await this.repository.findAll()).length;
    const producto = new Producto(
      randomUUID(),
      nombre,
      precioVentaPublico,
      new Decimal(0),
      0,
      aplicaIva,
      true,
      null,
      siguienteOrden,
      tipo,
      tipo === TipoProducto.ELABORADO ? (familiaElaboradoId ?? null) : null,
      tipo === TipoProducto.ELABORADO ? (factorEquivalencia ?? null) : null,
    );
    await this.repository.save(producto);
    return producto;
  }

  // Para la pantalla de venta del bar: los INSUMO nunca se venden directamente (maíz,
  // aceite, sal solo tienen sentido consumidos internamente por un ELABORADO).
  public async listarVendibles(): Promise<Producto[]> {
    const productos = await this.repository.findAll();
    return productos.filter((p) => p.tipo !== TipoProducto.INSUMO);
  }

  public async actualizar(
    id: string,
    nombre: string,
    precioVentaPublico: Decimal,
    aplicaIva: boolean,
  ): Promise<Producto> {
    const producto = await this.buscarOFallar(id);
    const actualizado = producto.conDatos(nombre, precioVentaPublico, aplicaIva);
    await this.repository.save(actualizado);
    return actualizado;
  }

  // Usado por VentaBarService (Ventas/Bar): descuenta o repone stock por una venta, sin
  // pasar por recalcularDesdeHistorial — una venta de bar no es una RecepcionStock ni un
  // AjusteStock, y no debe alterar el coste medio ponderado (solo consume al coste ya
  // vigente, que VentaBarService ya snapshotea en cada línea antes de llamar aquí).
  public async ajustarCantidadPorVenta(id: string, delta: number): Promise<Producto> {
    const producto = await this.buscarOFallar(id);
    const actualizado = producto.conCantidadYCoste(producto.cantidadActual + delta, producto.costeUnitarioActual);
    await this.repository.save(actualizado);
    return actualizado;
  }

  public async actualizarImagen(id: string, imagenUrl: string): Promise<Producto> {
    const producto = await this.buscarOFallar(id);
    const actualizado = producto.conImagen(imagenUrl);
    await this.repository.save(actualizado);
    return actualizado;
  }

  public async desactivar(id: string): Promise<Producto> {
    const producto = await this.buscarOFallar(id);
    const actualizado = producto.desactivado();
    await this.repository.save(actualizado);
    return actualizado;
  }

  public async activar(id: string): Promise<Producto> {
    const producto = await this.buscarOFallar(id);
    const actualizado = producto.activado();
    await this.repository.save(actualizado);
    return actualizado;
  }

  public async eliminar(id: string): Promise<void> {
    await this.buscarOFallar(id);
    const usado =
      (await this.recepcionRepository.existeConProducto(id)) || (await this.ajusteRepository.existeConProducto(id));
    if (usado) {
      throw new ConflictException(
        'No se puede eliminar un producto con movimientos de stock registrados; desactívalo en su lugar',
      );
    }
    await this.repository.delete(id);
  }

  public async listar(): Promise<Producto[]> {
    return this.repository.findAll();
  }

  /** Intercambia el orden manual de un producto con su vecino inmediato en esa dirección.
   * No hace nada si ya está en el extremo correspondiente (no hay vecino). */
  public async mover(id: string, direccion: DireccionOrden): Promise<Producto[]> {
    const productos = await this.repository.findAll(); // ya vienen ordenados por `orden`
    const indice = productos.findIndex((p) => p.id === id);
    if (indice === -1) {
      throw new NotFoundException('Producto no encontrado');
    }
    const indiceVecino = direccion === DireccionOrden.ARRIBA ? indice - 1 : indice + 1;
    if (indiceVecino < 0 || indiceVecino >= productos.length) {
      return productos;
    }

    const actual = productos[indice];
    const vecino = productos[indiceVecino];
    await this.repository.save(actual.conOrden(vecino.orden));
    await this.repository.save(vecino.conOrden(actual.orden));

    return this.repository.findAll();
  }

  public async obtener(id: string): Promise<Producto> {
    return this.buscarOFallar(id);
  }

  /**
   * Recalcula cantidadActual y costeUnitarioActual (coste medio ponderado) replayando
   * TODO el historial de recepciones y ajustes de este producto en orden cronológico.
   * Se llama tras cualquier crear/editar/eliminar recepción o ajuste — nunca se parchea
   * el coste de forma incremental, porque editar/eliminar un movimiento antiguo puede
   * cambiar la media desde ese punto en adelante.
   *
   * Solo las ENTRADAS (recepciones) mueven la media ponderada:
   *   nuevaMedia = (cantidadPrevia × mediaPrevia + cantidadEntrada × costeEntrada) / cantidadTotal
   * Las SALIDAS (ajustes) solo restan cantidad — nunca alteran el coste medio, se limitan
   * a consumir al coste medio vigente en ese momento (ya snapshoteado en cada ajuste).
   *
   * Nota: si se edita una recepción antigua, esto recalcula correctamente el coste medio
   * ACTUAL hacia delante, pero no reabre en cascada los asientos de ajustes ya posteados
   * con la media de entonces — igual que un cierre contable real, no se reescribe historia
   * ya asentada por una corrección posterior.
   */
  public async recalcularDesdeHistorial(id: string): Promise<Producto> {
    const producto = await this.buscarOFallar(id);
    // Un INSUMO no se compra "por unidad blendeable" desde recepciones/ajustes — su media se
    // actualiza solo al CERRAR un lote (ver registrarCierreLoteInsumo, en ventas/
    // CosteElaboradoService). Un ELABORADO no tiene stock propio en absoluto. En ambos casos
    // este replay (recepciones+ajustes) no aplica — no-op.
    if (producto.tipo !== TipoProducto.VENTA_DIRECTA) {
      return producto;
    }
    const [recepciones, ajustes] = await Promise.all([
      this.recepcionRepository.findAll({ productoId: id }),
      this.ajusteRepository.findAll(id),
    ]);

    // Se ordena por `fecha` (fecha y hora completas, editables por el usuario) — es el
    // único campo de fecha, y quien decide dónde encaja cada movimiento en el historial.
    type Evento = { fecha: Date; esEntrada: boolean; cantidad: number; costeUnitario?: Decimal };
    const eventos: Evento[] = [
      ...recepciones.map((r) => ({ fecha: r.fecha, esEntrada: true, cantidad: r.cantidad, costeUnitario: r.costeUnitario })),
      ...ajustes.map((a) => ({ fecha: a.fecha, esEntrada: false, cantidad: a.cantidad })),
    ].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    let cantidadActual = 0;
    let costeMedio = new Decimal(0);

    for (const evento of eventos) {
      if (evento.esEntrada) {
        const valorPrevio = costeMedio.times(cantidadActual);
        const valorEntrada = evento.costeUnitario!.times(evento.cantidad);
        cantidadActual += evento.cantidad;
        costeMedio =
          cantidadActual > 0
            ? valorPrevio.plus(valorEntrada).dividedBy(cantidadActual).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
            : new Decimal(0);
      } else {
        cantidadActual -= evento.cantidad;
      }
    }

    const actualizado = producto.conCantidadYCoste(cantidadActual, costeMedio);
    await this.repository.save(actualizado);
    return actualizado;
  }

  /**
   * Llamado por CosteElaboradoService.iniciarUsoLote (ventas) al CERRAR un lote de INSUMO —
   * incorpora su coste-por-unidad-equivalente a la media acumulada de ese insumo, con el
   * mismo criterio de PMP que recalcularDesdeHistorial (ponderado por cantidad), solo que
   * aquí "cantidad" son unidades equivalentes vendidas y no unidades físicas. Repurpose
   * deliberado de costeUnitarioActual/cantidadActual para INSUMO — es una media histórica
   * sobre lotes YA cerrados, nunca se revisita un cierre anterior (igual que un asiento ya
   * posteado no se reabre).
   */
  public async registrarCierreLoteInsumo(
    insumoId: string,
    unidadesDelLote: Decimal,
    costeDelLote: Decimal,
  ): Promise<Producto> {
    const producto = await this.buscarOFallar(insumoId);
    const valorPrevio = producto.costeUnitarioActual.times(producto.cantidadActual);
    const valorNuevo = costeDelLote.times(unidadesDelLote);
    const cantidadNueva = producto.cantidadActual + Math.round(unidadesDelLote.toNumber());
    const costeMedio =
      cantidadNueva > 0
        ? valorPrevio.plus(valorNuevo).dividedBy(cantidadNueva).toDecimalPlaces(4, Decimal.ROUND_HALF_UP)
        : new Decimal(0);
    const actualizado = producto.conCantidadYCoste(cantidadNueva, costeMedio);
    await this.repository.save(actualizado);
    return actualizado;
  }

  private async buscarOFallar(id: string): Promise<Producto> {
    const producto = await this.repository.findById(id);
    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }
    return producto;
  }
}
