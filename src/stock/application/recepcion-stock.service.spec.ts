import Decimal from 'decimal.js';
import { AccountingService } from '../../accounting/application/accounting.service';
import { InMemoryJournalEntryRepository } from '../../accounting/infrastructure/in-memory-journal-entry.repository';
import { InMemoryAccountRepository } from '../../accounting/infrastructure/in-memory-account.repository';
import { AccountType } from '../../accounting/domain/account';
import { Producto } from '../domain/producto';
import { ProductoRepository } from './producto.repository';
import { RecepcionStock } from '../domain/recepcion-stock';
import { RecepcionStockFilter, RecepcionStockRepository } from './recepcion-stock.repository';
import { AjusteStock } from '../domain/ajuste-stock';
import { AjusteStockRepository } from './ajuste-stock.repository';
import { TipoFiscal } from '../domain/tipo-fiscal';
import { TipoProducto } from '../domain/tipo-producto';
import { UnidadMedida } from '../domain/unidad-medida';
import { EstadoPagoRecepcion } from '../domain/estado-pago-recepcion';
import { ProductoService } from './producto.service';
import { RecepcionStockService } from './recepcion-stock.service';

class InMemoryProductoRepository implements ProductoRepository {
  private readonly productos = new Map<string, Producto>();
  async save(producto: Producto): Promise<void> {
    this.productos.set(producto.id, producto);
  }
  async findById(id: string): Promise<Producto | null> {
    return this.productos.get(id) ?? null;
  }
  async findAll(): Promise<Producto[]> {
    return [...this.productos.values()];
  }
  async delete(id: string): Promise<void> {
    this.productos.delete(id);
  }
}

class InMemoryRecepcionStockRepository implements RecepcionStockRepository {
  private readonly recepciones = new Map<string, RecepcionStock>();
  async save(recepcion: RecepcionStock): Promise<void> {
    this.recepciones.set(recepcion.id, recepcion);
  }
  async findById(id: string): Promise<RecepcionStock | null> {
    return this.recepciones.get(id) ?? null;
  }
  async findAll(filter?: RecepcionStockFilter): Promise<RecepcionStock[]> {
    let todas = [...this.recepciones.values()];
    if (filter?.productoId) todas = todas.filter((r) => r.productoId === filter.productoId);
    if (filter?.estadoPago) todas = todas.filter((r) => r.estadoPago === filter.estadoPago);
    return todas;
  }
  async existeConProducto(productoId: string): Promise<boolean> {
    return [...this.recepciones.values()].some((r) => r.productoId === productoId);
  }
  async delete(id: string): Promise<void> {
    this.recepciones.delete(id);
  }
}

class InMemoryAjusteStockRepository implements AjusteStockRepository {
  private readonly ajustes = new Map<string, AjusteStock>();
  async save(): Promise<void> {}
  async findById(): Promise<AjusteStock | null> {
    return null;
  }
  async findAll(): Promise<AjusteStock[]> {
    return [...this.ajustes.values()];
  }
  async existeConProducto(): Promise<boolean> {
    return false;
  }
  async delete(): Promise<void> {}
}

describe('RecepcionStockService', () => {
  let accountingService: AccountingService;
  let productoService: ProductoService;
  let service: RecepcionStockService;
  let cuentaOrigenId: string;

  beforeEach(async () => {
    accountingService = new AccountingService(new InMemoryJournalEntryRepository(), new InMemoryAccountRepository());
    const recepcionRepo = new InMemoryRecepcionStockRepository();
    productoService = new ProductoService(
      new InMemoryProductoRepository(),
      recepcionRepo,
      new InMemoryAjusteStockRepository(),
    );
    service = new RecepcionStockService(recepcionRepo, productoService, accountingService);

    await accountingService.crearCuenta({ nombre: 'Stock bar', code: '300001', type: AccountType.ASSET, esCuentaDeDinero: false });
    await accountingService.crearCuenta({
      nombre: 'Hacienda Pública, IVA soportado',
      code: '472001',
      type: AccountType.ASSET,
      esCuentaDeDinero: false,
    });
    const cuentaOrigen = await accountingService.crearCuenta({
      nombre: 'Tesorería general',
      code: '570001',
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });
    cuentaOrigenId = cuentaOrigen.id;
    await accountingService.crearCuenta({
      nombre: 'Proveedores de stock',
      code: '400002',
      type: AccountType.LIABILITY,
      esCuentaDeDinero: false,
    });
  });

  it('incrementa la cantidad y el coste del producto, y postea 300001 débito / cuenta origen crédito', async () => {
    const producto = await productoService.crear('Coca-Cola', new Decimal(2), true);

    const recepcion = await service.crear({
      productoId: producto.id,
      cantidad: 24,
      costeUnitario: 0.5,
      fecha: new Date('2026-07-10'),
      cuentaOrigenId,
    });

    expect(recepcion.cantidad).toBe(24);
    const actualizado = await productoService.obtener(producto.id);
    expect(actualizado.cantidadActual).toBe(24);
    expect(actualizado.costeUnitarioActual.equals(new Decimal(0.5))).toBe(true);

    const cuentaStock = await accountingService.obtenerCuentaPorCodigo('300001');
    expect((await accountingService.saldoPorCuenta(cuentaStock.id)).equals(new Decimal(12))).toBe(true);
    const cuentaOrigen = await accountingService.obtenerCuentaPorId(cuentaOrigenId);
    expect((await accountingService.saldoPorCuenta(cuentaOrigen.id)).equals(new Decimal(-12))).toBe(true);
  });

  it('tipoFiscal=A: reparte en base imponible + IVA soportado (472001) y el coste unitario es la base por unidad', async () => {
    const producto = await productoService.crear('Coca-Cola', new Decimal(2), true);

    const recepcion = await service.crear({
      productoId: producto.id,
      cantidad: 24,
      tipoFiscal: TipoFiscal.A,
      baseImponible: 100,
      ivaPercent: 21,
      fecha: new Date('2026-07-10'),
      cuentaOrigenId,
    });

    expect(recepcion.baseImponible.equals(new Decimal(100))).toBe(true);
    expect(recepcion.importeIva?.equals(new Decimal(21))).toBe(true);
    expect(recepcion.importeTotal.equals(new Decimal(121))).toBe(true);
    // 100 / 24 = 4.1666... redondeado a 2 decimales
    expect(recepcion.costeUnitario.equals(new Decimal('4.17'))).toBe(true);

    const actualizado = await productoService.obtener(producto.id);
    expect(actualizado.costeUnitarioActual.equals(new Decimal('4.17'))).toBe(true);

    const cuentaStock = await accountingService.obtenerCuentaPorCodigo('300001');
    expect((await accountingService.saldoPorCuenta(cuentaStock.id)).equals(new Decimal(100))).toBe(true);
    const cuenta472001 = await accountingService.obtenerCuentaPorCodigo('472001');
    expect((await accountingService.saldoPorCuenta(cuenta472001.id)).equals(new Decimal(21))).toBe(true);
    const cuentaOrigenResuelta = await accountingService.obtenerCuentaPorId(cuentaOrigenId);
    expect((await accountingService.saldoPorCuenta(cuentaOrigenResuelta.id)).equals(new Decimal(-121))).toBe(true);
  });

  it('rechaza tipoFiscal=A sin baseImponible/ivaPercent', async () => {
    const producto = await productoService.crear('Coca-Cola', new Decimal(2), true);
    await expect(
      service.crear({
        productoId: producto.id,
        cantidad: 24,
        tipoFiscal: TipoFiscal.A,
        fecha: new Date('2026-07-10'),
        cuentaOrigenId,
      }),
    ).rejects.toThrow(/baseImponible e ivaPercent/i);
  });

  it('rechaza tipoFiscal=B sin costeUnitario', async () => {
    const producto = await productoService.crear('Coca-Cola', new Decimal(2), true);
    await expect(
      service.crear({
        productoId: producto.id,
        cantidad: 24,
        fecha: new Date('2026-07-10'),
        cuentaOrigenId,
      }),
    ).rejects.toThrow(/costeUnitario es obligatorio/i);
  });

  it('eliminar revierte el asiento y decrementa la cantidad recibida', async () => {
    const producto = await productoService.crear('Coca-Cola', new Decimal(2), true);
    const recepcion = await service.crear({
      productoId: producto.id,
      cantidad: 24,
      costeUnitario: 0.5,
      fecha: new Date('2026-07-10'),
      cuentaOrigenId,
    });

    await service.eliminar(recepcion.id);

    const actualizado = await productoService.obtener(producto.id);
    expect(actualizado.cantidadActual).toBe(0);
    const cuentaStock = await accountingService.obtenerCuentaPorCodigo('300001');
    expect((await accountingService.saldoPorCuenta(cuentaStock.id)).equals(new Decimal(0))).toBe(true);
  });

  describe('actualizar', () => {
    it('corrige la cantidad de una recepción B, ajustando stock y asiento sin duplicar', async () => {
      const producto = await productoService.crear('Coca-Cola', new Decimal(2), true);
      const recepcion = await service.crear({
        productoId: producto.id,
        cantidad: 24,
        costeUnitario: 0.5,
        fecha: new Date('2026-07-10'),
        cuentaOrigenId,
      });

      const corregida = await service.actualizar(recepcion.id, {
        cantidad: 10,
        costeUnitario: 0.5,
        fecha: new Date('2026-07-10'),
        cuentaOrigenId,
      });

      expect(corregida.id).toBe(recepcion.id);
      expect(corregida.cantidad).toBe(10);
      const actualizado = await productoService.obtener(producto.id);
      expect(actualizado.cantidadActual).toBe(10);
      const cuentaStock = await accountingService.obtenerCuentaPorCodigo('300001');
      expect((await accountingService.saldoPorCuenta(cuentaStock.id)).equals(new Decimal(5))).toBe(true);
    });

    it('permite pasar de B a A al editar, reclasificando el asiento', async () => {
      const producto = await productoService.crear('Coca-Cola', new Decimal(2), true);
      const recepcion = await service.crear({
        productoId: producto.id,
        cantidad: 24,
        costeUnitario: 0.5,
        fecha: new Date('2026-07-10'),
        cuentaOrigenId,
      });

      const corregida = await service.actualizar(recepcion.id, {
        cantidad: 24,
        tipoFiscal: TipoFiscal.A,
        baseImponible: 100,
        ivaPercent: 21,
        fecha: new Date('2026-07-10'),
        cuentaOrigenId,
      });

      expect(corregida.importeIva?.equals(new Decimal(21))).toBe(true);
      const cuenta472001 = await accountingService.obtenerCuentaPorCodigo('472001');
      expect((await accountingService.saldoPorCuenta(cuenta472001.id)).equals(new Decimal(21))).toBe(true);
      const cuentaStock = await accountingService.obtenerCuentaPorCodigo('300001');
      expect((await accountingService.saldoPorCuenta(cuentaStock.id)).equals(new Decimal(100))).toBe(true);
    });
  });

  describe('estadoPago = PENDIENTE_PAGO y pagarPendiente', () => {
    it('crea una recepción pendiente de pago sin cuentaOrigenId, acreditando 400002 en vez de la cuenta origen', async () => {
      const producto = await productoService.crear('Coca-Cola', new Decimal(2), true);
      const recepcion = await service.crear({
        productoId: producto.id,
        cantidad: 24,
        costeUnitario: 0.5,
        fecha: new Date('2026-07-10'),
        estadoPago: EstadoPagoRecepcion.PENDIENTE_PAGO,
      });

      expect(recepcion.estadoPago).toBe(EstadoPagoRecepcion.PENDIENTE_PAGO);
      expect(recepcion.cuentaOrigenId).toBeUndefined();

      const cuentaStock = await accountingService.obtenerCuentaPorCodigo('300001');
      expect((await accountingService.saldoPorCuenta(cuentaStock.id)).equals(new Decimal(12))).toBe(true);
      const cuentaProveedores = await accountingService.obtenerCuentaPorCodigo('400002');
      // 400002 es pasivo — un crédito lo aumenta (convención contraria a la de un activo como 570001).
      expect((await accountingService.saldoPorCuenta(cuentaProveedores.id)).equals(new Decimal(12))).toBe(true);
    });

    it('rechaza estadoPago = PAGADO sin cuentaOrigenId', async () => {
      const producto = await productoService.crear('Coca-Cola', new Decimal(2), true);
      await expect(
        service.crear({
          productoId: producto.id,
          cantidad: 24,
          costeUnitario: 0.5,
          fecha: new Date('2026-07-10'),
          estadoPago: EstadoPagoRecepcion.PAGADO,
        }),
      ).rejects.toThrow(/cuentaOrigenId es obligatorio/i);
    });

    it('pagarPendiente liquida 400002 contra la cuenta real y marca la recepción como PAGADO', async () => {
      const producto = await productoService.crear('Coca-Cola', new Decimal(2), true);
      const recepcion = await service.crear({
        productoId: producto.id,
        cantidad: 24,
        costeUnitario: 0.5,
        fecha: new Date('2026-07-10'),
        estadoPago: EstadoPagoRecepcion.PENDIENTE_PAGO,
      });

      const pagada = await service.pagarPendiente(recepcion.id, cuentaOrigenId);

      expect(pagada.estadoPago).toBe(EstadoPagoRecepcion.PAGADO);
      expect(pagada.cuentaOrigenId).toBe(cuentaOrigenId);

      const cuentaProveedores = await accountingService.obtenerCuentaPorCodigo('400002');
      expect((await accountingService.saldoPorCuenta(cuentaProveedores.id)).equals(new Decimal(0))).toBe(true);
      const cuentaOrigen = await accountingService.obtenerCuentaPorId(cuentaOrigenId);
      expect((await accountingService.saldoPorCuenta(cuentaOrigen.id)).equals(new Decimal(-12))).toBe(true);
    });

    it('rechaza pagarPendiente sobre una recepción que ya está pagada', async () => {
      const producto = await productoService.crear('Coca-Cola', new Decimal(2), true);
      const recepcion = await service.crear({
        productoId: producto.id,
        cantidad: 24,
        costeUnitario: 0.5,
        fecha: new Date('2026-07-10'),
        cuentaOrigenId,
      });
      await expect(service.pagarPendiente(recepcion.id, cuentaOrigenId)).rejects.toThrow(/ya está pagada/i);
    });

    it('actualizar puede reclasificar de PENDIENTE_PAGO a PAGADO, revirtiendo el asiento anterior sin duplicar', async () => {
      const producto = await productoService.crear('Coca-Cola', new Decimal(2), true);
      const recepcion = await service.crear({
        productoId: producto.id,
        cantidad: 24,
        costeUnitario: 0.5,
        fecha: new Date('2026-07-10'),
        estadoPago: EstadoPagoRecepcion.PENDIENTE_PAGO,
      });

      const corregida = await service.actualizar(recepcion.id, {
        cantidad: 24,
        costeUnitario: 0.5,
        fecha: new Date('2026-07-10'),
        estadoPago: EstadoPagoRecepcion.PAGADO,
        cuentaOrigenId,
      });

      expect(corregida.estadoPago).toBe(EstadoPagoRecepcion.PAGADO);
      const cuentaProveedores = await accountingService.obtenerCuentaPorCodigo('400002');
      expect((await accountingService.saldoPorCuenta(cuentaProveedores.id)).equals(new Decimal(0))).toBe(true);
      const cuentaOrigen = await accountingService.obtenerCuentaPorId(cuentaOrigenId);
      expect((await accountingService.saldoPorCuenta(cuentaOrigen.id)).equals(new Decimal(-12))).toBe(true);
    });

    it('eliminar revierte también el asiento de pago si la recepción ya se había liquidado', async () => {
      const producto = await productoService.crear('Coca-Cola', new Decimal(2), true);
      const recepcion = await service.crear({
        productoId: producto.id,
        cantidad: 24,
        costeUnitario: 0.5,
        fecha: new Date('2026-07-10'),
        estadoPago: EstadoPagoRecepcion.PENDIENTE_PAGO,
      });
      await service.pagarPendiente(recepcion.id, cuentaOrigenId);

      await service.eliminar(recepcion.id);

      const cuentaStock = await accountingService.obtenerCuentaPorCodigo('300001');
      expect((await accountingService.saldoPorCuenta(cuentaStock.id)).equals(new Decimal(0))).toBe(true);
      const cuentaProveedores = await accountingService.obtenerCuentaPorCodigo('400002');
      expect((await accountingService.saldoPorCuenta(cuentaProveedores.id)).equals(new Decimal(0))).toBe(true);
      const cuentaOrigen = await accountingService.obtenerCuentaPorId(cuentaOrigenId);
      expect((await accountingService.saldoPorCuenta(cuentaOrigen.id)).equals(new Decimal(0))).toBe(true);
    });
  });

  describe('INSUMO: lotes de cantidad=1, cantidadMedida informativa, ciclo de uso', () => {
    it('rechaza una recepción de INSUMO con cantidad distinta de 1', async () => {
      const maiz = await productoService.crear('Maíz', new Decimal(0), false, TipoProducto.INSUMO);
      await expect(
        service.crear({
          productoId: maiz.id,
          cantidad: 15,
          costeUnitario: 20,
          fecha: new Date('2026-07-01'),
          cuentaOrigenId,
        }),
      ).rejects.toThrow(/siempre una unidad/i);
    });

    it('rechaza recepciones para un producto ELABORADO', async () => {
      const palomitaPequena = await productoService.crear(
        'Palomita pequeña',
        new Decimal(2),
        true,
        TipoProducto.ELABORADO,
        'familia-1',
        new Decimal(1),
      );
      await expect(
        service.crear({
          productoId: palomitaPequena.id,
          cantidad: 1,
          costeUnitario: 5,
          fecha: new Date('2026-07-01'),
          cuentaOrigenId,
        }),
      ).rejects.toThrow(/no tiene recepciones propias/i);
    });

    it('guarda cantidadMedida/unidadMedida (informativas) sin que afecten al coste', async () => {
      const maiz = await productoService.crear('Maíz', new Decimal(0), false, TipoProducto.INSUMO);
      const lote = await service.crear({
        productoId: maiz.id,
        cantidad: 1,
        costeUnitario: 20, // coste total del saco entero
        fecha: new Date('2026-07-01'),
        cuentaOrigenId,
        cantidadMedida: 15,
        unidadMedida: UnidadMedida.KG,
      });

      expect(lote.cantidadMedida?.equals(new Decimal(15))).toBe(true);
      expect(lote.unidadMedida).toBe(UnidadMedida.KG);
      expect(lote.baseImponible.equals(new Decimal(20))).toBe(true);
      // Un INSUMO no participa del PMP por unidad — recalcularDesdeHistorial es un no-op.
      const actualizado = await productoService.obtener(maiz.id);
      expect(actualizado.cantidadActual).toBe(0);
      expect(actualizado.costeUnitarioActual.equals(new Decimal(0))).toBe(true);
    });

    it('loteActivo es null hasta que se inicia el uso de un lote', async () => {
      const maiz = await productoService.crear('Maíz', new Decimal(0), false, TipoProducto.INSUMO);
      await service.crear({
        productoId: maiz.id,
        cantidad: 1,
        costeUnitario: 20,
        fecha: new Date('2026-07-01'),
        cuentaOrigenId,
      });

      expect(await service.loteActivo(maiz.id)).toBeNull();
    });

    it('iniciarUso marca el lote como activo, y abrir el siguiente cierra el anterior', async () => {
      const maiz = await productoService.crear('Maíz', new Decimal(0), false, TipoProducto.INSUMO);
      const lote1 = await service.crear({
        productoId: maiz.id,
        cantidad: 1,
        costeUnitario: 20,
        fecha: new Date('2026-07-01'),
        cuentaOrigenId,
      });
      const lote2 = await service.crear({
        productoId: maiz.id,
        cantidad: 1,
        costeUnitario: 25,
        fecha: new Date('2026-07-10'),
        cuentaOrigenId,
      });

      await service.iniciarUso(lote1.id, new Date('2026-07-01T09:00:00Z'));
      let activo = await service.loteActivo(maiz.id);
      expect(activo?.id).toBe(lote1.id);

      // Abrir el segundo lote deja al primero "consumido" de forma derivada, sin tocarlo.
      await service.iniciarUso(lote2.id, new Date('2026-07-10T09:00:00Z'));
      activo = await service.loteActivo(maiz.id);
      expect(activo?.id).toBe(lote2.id);
    });

    it('rechaza iniciarUso sobre un lote de un producto que no es INSUMO', async () => {
      const producto = await productoService.crear('Coca-Cola', new Decimal(2), true);
      const recepcion = await service.crear({
        productoId: producto.id,
        cantidad: 24,
        costeUnitario: 0.5,
        fecha: new Date('2026-07-10'),
        cuentaOrigenId,
      });
      await expect(service.iniciarUso(recepcion.id, new Date())).rejects.toThrow(/solo los lotes de un insumo/i);
    });

    it('rechaza editar o eliminar un lote ya cerrado (historia ya asentada)', async () => {
      const maiz = await productoService.crear('Maíz', new Decimal(0), false, TipoProducto.INSUMO);
      const lote = await service.crear({
        productoId: maiz.id,
        cantidad: 1,
        costeUnitario: 20,
        fecha: new Date('2026-07-01'),
        cuentaOrigenId,
      });
      await service.marcarCierre(lote.id, 'je-cierre-1');

      await expect(
        service.actualizar(lote.id, {
          cantidad: 1,
          costeUnitario: 25,
          fecha: new Date('2026-07-01'),
          cuentaOrigenId,
        }),
      ).rejects.toThrow(/ya se cerró/i);
      await expect(service.eliminar(lote.id)).rejects.toThrow(/ya se cerró/i);
    });
  });
});
