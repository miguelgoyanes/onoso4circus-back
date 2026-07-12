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
import { TipoAjusteStock } from '../domain/tipo-ajuste-stock';
import { ProductoService } from './producto.service';
import { AjusteStockService } from './ajuste-stock.service';

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
  async save(ajuste: AjusteStock): Promise<void> {
    this.ajustes.set(ajuste.id, ajuste);
  }
  async findById(id: string): Promise<AjusteStock | null> {
    return this.ajustes.get(id) ?? null;
  }
  async findAll(productoId?: string): Promise<AjusteStock[]> {
    const todos = [...this.ajustes.values()];
    return productoId ? todos.filter((a) => a.productoId === productoId) : todos;
  }
  async existeConProducto(productoId: string): Promise<boolean> {
    return [...this.ajustes.values()].some((a) => a.productoId === productoId);
  }
  async delete(id: string): Promise<void> {
    this.ajustes.delete(id);
  }
}

describe('AjusteStockService', () => {
  let accountingService: AccountingService;
  let productoService: ProductoService;
  let recepcionRepo: InMemoryRecepcionStockRepository;
  let ajusteRepo: InMemoryAjusteStockRepository;
  let service: AjusteStockService;

  async function recibirStock(productoId: string, cantidad: number, costeUnitario: number) {
    await recepcionRepo.save(
      new RecepcionStock({
        id: `r-${Math.random()}`,
        productoId,
        cantidad,
        costeUnitario: new Decimal(costeUnitario),
        baseImponible: new Decimal(costeUnitario).times(cantidad),
        importeTotal: new Decimal(costeUnitario).times(cantidad),
        fecha: new Date('2026-07-01'),
        cuentaOrigenId: 'cuenta-1',
        journalEntryId: `je-${Math.random()}`,
      }),
    );
    await productoService.recalcularDesdeHistorial(productoId);
  }

  beforeEach(async () => {
    accountingService = new AccountingService(new InMemoryJournalEntryRepository(), new InMemoryAccountRepository());
    recepcionRepo = new InMemoryRecepcionStockRepository();
    ajusteRepo = new InMemoryAjusteStockRepository();
    productoService = new ProductoService(new InMemoryProductoRepository(), recepcionRepo, ajusteRepo);
    service = new AjusteStockService(ajusteRepo, productoService, accountingService);

    await accountingService.crearCuenta({ nombre: 'Stock bar', code: '300001', type: AccountType.ASSET, esCuentaDeDinero: false });
    await accountingService.crearCuenta({
      nombre: 'Consumo interno / mermas bar',
      code: '606001',
      type: AccountType.EXPENSE,
      esCuentaDeDinero: false,
    });
  });

  it('decrementa la cantidad, usa el coste unitario actual del producto y postea 606001 débito / 300001 crédito', async () => {
    const producto = await productoService.crear('Coca-Cola', new Decimal(2), true);
    await recibirStock(producto.id, 24, 0.5);

    const ajuste = await service.crear({
      productoId: producto.id,
      tipo: TipoAjusteStock.MERMA,
      cantidad: 4,
      fecha: new Date('2026-07-05'),
    });

    expect(ajuste.costeUnitarioAplicado.equals(new Decimal(0.5))).toBe(true);
    const actualizado = await productoService.obtener(producto.id);
    expect(actualizado.cantidadActual).toBe(20);
    expect(actualizado.costeUnitarioActual.equals(new Decimal(0.5))).toBe(true);

    const cuentaConsumo = await accountingService.obtenerCuentaPorCodigo('606001');
    expect((await accountingService.saldoPorCuenta(cuentaConsumo.id)).equals(new Decimal(2))).toBe(true);
    const cuentaStock = await accountingService.obtenerCuentaPorCodigo('300001');
    expect((await accountingService.saldoPorCuenta(cuentaStock.id)).equals(new Decimal(-2))).toBe(true);
  });

  it('rechaza un ajuste sobre un producto sin coste registrado (nunca recibió stock)', async () => {
    const producto = await productoService.crear('Sin recibir', new Decimal(2), true);
    await expect(
      service.crear({ productoId: producto.id, tipo: TipoAjusteStock.MERMA, cantidad: 1, fecha: new Date('2026-07-05') }),
    ).rejects.toThrow(/coste registrado/i);
  });

  it('permite dejar el stock en negativo, nunca bloquea el ajuste', async () => {
    const producto = await productoService.crear('Coca-Cola', new Decimal(2), true);
    await recibirStock(producto.id, 3, 0.5);
    await service.crear({
      productoId: producto.id,
      tipo: TipoAjusteStock.CONSUMO_INTERNO,
      cantidad: 8,
      fecha: new Date('2026-07-05'),
    });
    const actualizado = await productoService.obtener(producto.id);
    expect(actualizado.cantidadActual).toBe(-5);
  });

  it('eliminar revierte el asiento y repone la cantidad (el coste medio no se ve afectado por salidas)', async () => {
    const producto = await productoService.crear('Coca-Cola', new Decimal(2), true);
    await recibirStock(producto.id, 24, 0.5);
    const ajuste = await service.crear({
      productoId: producto.id,
      tipo: TipoAjusteStock.MERMA,
      cantidad: 4,
      fecha: new Date('2026-07-05'),
    });

    await service.eliminar(ajuste.id);

    const actualizado = await productoService.obtener(producto.id);
    expect(actualizado.cantidadActual).toBe(24);
    expect(actualizado.costeUnitarioActual.equals(new Decimal(0.5))).toBe(true);
    // recibirStock() (helper de este spec) guarda la recepción directamente en el
    // repositorio sin postear su propio asiento — el único asiento real de esta prueba es
    // el del ajuste, ya revertido, así que 300001 vuelve a 0.
    const cuentaStock = await accountingService.obtenerCuentaPorCodigo('300001');
    expect((await accountingService.saldoPorCuenta(cuentaStock.id)).equals(new Decimal(0))).toBe(true);
  });

  describe('actualizar', () => {
    it('corrige la cantidad de un ajuste, reponiendo la cantidad vieja y aplicando la nueva', async () => {
      const producto = await productoService.crear('Coca-Cola', new Decimal(2), true);
      await recibirStock(producto.id, 24, 0.5);
      const ajuste = await service.crear({
        productoId: producto.id,
        tipo: TipoAjusteStock.MERMA,
        cantidad: 4,
        fecha: new Date('2026-07-05'),
      });

      const corregido = await service.actualizar(ajuste.id, {
        tipo: TipoAjusteStock.MERMA,
        cantidad: 1,
        fecha: new Date('2026-07-06'),
      });

      expect(corregido.id).toBe(ajuste.id);
      expect(corregido.cantidad).toBe(1);
      const actualizado = await productoService.obtener(producto.id);
      expect(actualizado.cantidadActual).toBe(23);
      const cuentaConsumo = await accountingService.obtenerCuentaPorCodigo('606001');
      expect((await accountingService.saldoPorCuenta(cuentaConsumo.id)).equals(new Decimal(0.5))).toBe(true);
    });
  });
});
