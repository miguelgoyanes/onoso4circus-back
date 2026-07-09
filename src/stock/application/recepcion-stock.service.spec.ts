import Decimal from 'decimal.js';
import { AccountingService } from '../../accounting/application/accounting.service';
import { InMemoryJournalEntryRepository } from '../../accounting/infrastructure/in-memory-journal-entry.repository';
import { InMemoryAccountRepository } from '../../accounting/infrastructure/in-memory-account.repository';
import { AccountType } from '../../accounting/domain/account';
import { Producto } from '../domain/producto';
import { ProductoRepository } from './producto.repository';
import { RecepcionStock } from '../domain/recepcion-stock';
import { RecepcionStockRepository } from './recepcion-stock.repository';
import { AjusteStock } from '../domain/ajuste-stock';
import { AjusteStockRepository } from './ajuste-stock.repository';
import { TipoFiscal } from '../domain/tipo-fiscal';
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
  async findAll(productoId?: string): Promise<RecepcionStock[]> {
    const todas = [...this.recepciones.values()];
    return productoId ? todas.filter((r) => r.productoId === productoId) : todas;
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
});
