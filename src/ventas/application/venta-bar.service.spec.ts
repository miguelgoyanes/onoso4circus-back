import Decimal from 'decimal.js';
import { Plaza } from '../../plazas/domain/plaza';
import { Fecha } from '../../plazas/domain/fecha';
import { Pase } from '../../plazas/domain/pase';
import { TipoActividad } from '../../plazas/domain/tipo-actividad';
import { PlazaRepository } from '../../plazas/application/plaza.repository';
import { FechaRepository } from '../../plazas/application/fecha.repository';
import { PaseRepository } from '../../plazas/application/pase.repository';
import { PlazaService } from '../../plazas/application/plaza.service';
import { FechaService } from '../../plazas/application/fecha.service';
import { PaseService } from '../../plazas/application/pase.service';
import { Producto } from '../../stock/domain/producto';
import { ProductoRepository } from '../../stock/application/producto.repository';
import { RecepcionStock } from '../../stock/domain/recepcion-stock';
import { RecepcionStockRepository } from '../../stock/application/recepcion-stock.repository';
import { AjusteStock } from '../../stock/domain/ajuste-stock';
import { AjusteStockRepository } from '../../stock/application/ajuste-stock.repository';
import { ProductoService } from '../../stock/application/producto.service';
import { RecepcionStockService } from '../../stock/application/recepcion-stock.service';
import { FamiliaElaboradoService } from '../../stock/application/familia-elaborado.service';
import { FamiliaElaborado } from '../../stock/domain/familia-elaborado';
import { FamiliaElaboradoRepository } from '../../stock/application/familia-elaborado.repository';
import { VinculacionInsumo } from '../../stock/domain/vinculacion-insumo';
import { VinculacionInsumoRepository } from '../../stock/application/vinculacion-insumo.repository';
import { AccountingService } from '../../accounting/application/accounting.service';
import { InMemoryJournalEntryRepository } from '../../accounting/infrastructure/in-memory-journal-entry.repository';
import { NoopUnitOfWork } from '../../accounting/infrastructure/noop-unit-of-work';
import { InMemoryAccountRepository } from '../../accounting/infrastructure/in-memory-account.repository';
import { AccountType } from '../../accounting/domain/account';
import { TipoFiscal } from '../domain/tipo-fiscal';
import { InMemoryVentaBarRepository } from '../infrastructure/in-memory-venta-bar.repository';
import { VentaBarService } from './venta-bar.service';
import { CosteElaboradoService } from './coste-elaborado.service';

class InMemoryPlazaRepository implements PlazaRepository {
  private readonly plazas = new Map<string, Plaza>();
  async save(plaza: Plaza): Promise<void> {
    this.plazas.set(plaza.id, plaza);
  }
  async findById(id: string): Promise<Plaza | null> {
    return this.plazas.get(id) ?? null;
  }
  async findAll(): Promise<Plaza[]> {
    return [...this.plazas.values()];
  }
  async delete(id: string): Promise<void> {
    this.plazas.delete(id);
  }
}

class InMemoryFechaRepository implements FechaRepository {
  private readonly fechas = new Map<string, Fecha>();
  async save(fecha: Fecha): Promise<void> {
    this.fechas.set(fecha.id, fecha);
  }
  async findById(id: string): Promise<Fecha | null> {
    return this.fechas.get(id) ?? null;
  }
  async findByPlaza(plazaId: string): Promise<Fecha[]> {
    return [...this.fechas.values()].filter((f) => f.plazaId === plazaId);
  }
  async delete(id: string): Promise<void> {
    this.fechas.delete(id);
  }
}

class InMemoryPaseRepository implements PaseRepository {
  private readonly pases = new Map<string, Pase>();
  async save(pase: Pase): Promise<void> {
    this.pases.set(pase.id, pase);
  }
  async findById(id: string): Promise<Pase | null> {
    return this.pases.get(id) ?? null;
  }
  async findByFecha(fechaId: string): Promise<Pase[]> {
    return [...this.pases.values()].filter((p) => p.fechaId === fechaId);
  }
  async delete(id: string): Promise<void> {
    this.pases.delete(id);
  }
  async contarTodos(): Promise<number> {
    return this.pases.size;
  }
}

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
  async findAll(): Promise<RecepcionStock[]> {
    return [...this.recepciones.values()];
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
  async findAll(): Promise<AjusteStock[]> {
    return [...this.ajustes.values()];
  }
  async existeConProducto(productoId: string): Promise<boolean> {
    return [...this.ajustes.values()].some((a) => a.productoId === productoId);
  }
  async delete(id: string): Promise<void> {
    this.ajustes.delete(id);
  }
}

class InMemoryFamiliaElaboradoRepository implements FamiliaElaboradoRepository {
  private readonly familias = new Map<string, FamiliaElaborado>();
  async save(familia: FamiliaElaborado): Promise<void> {
    this.familias.set(familia.id, familia);
  }
  async findById(id: string): Promise<FamiliaElaborado | null> {
    return this.familias.get(id) ?? null;
  }
  async findAll(): Promise<FamiliaElaborado[]> {
    return [...this.familias.values()];
  }
  async delete(id: string): Promise<void> {
    this.familias.delete(id);
  }
}

class InMemoryVinculacionInsumoRepository implements VinculacionInsumoRepository {
  private readonly vinculaciones = new Map<string, VinculacionInsumo>();
  async save(vinculacion: VinculacionInsumo): Promise<void> {
    this.vinculaciones.set(vinculacion.id, vinculacion);
  }
  async findById(id: string): Promise<VinculacionInsumo | null> {
    return this.vinculaciones.get(id) ?? null;
  }
  async findByFamilia(familiaElaboradoId: string): Promise<VinculacionInsumo[]> {
    return [...this.vinculaciones.values()].filter((v) => v.familiaElaboradoId === familiaElaboradoId);
  }
  async findByInsumo(insumoId: string): Promise<VinculacionInsumo | null> {
    return [...this.vinculaciones.values()].find((v) => v.insumoId === insumoId) ?? null;
  }
  async existeConInsumo(insumoId: string): Promise<boolean> {
    return [...this.vinculaciones.values()].some((v) => v.insumoId === insumoId);
  }
  async delete(id: string): Promise<void> {
    this.vinculaciones.delete(id);
  }
}

describe('VentaBarService', () => {
  let accountingService: AccountingService;
  let productoRepo: InMemoryProductoRepository;
  let productoService: ProductoService;
  let service: VentaBarService;
  let paseId: string;
  let cuentaCobroId: string;
  let cocaColaId: string;
  let aguaId: string;

  beforeEach(async () => {
    const plazaRepo = new InMemoryPlazaRepository();
    const fechaRepo = new InMemoryFechaRepository();
    const plazaService = new PlazaService(plazaRepo);
    const fechaService = new FechaService(fechaRepo, plazaRepo);
    const paseService = new PaseService(new InMemoryPaseRepository(), fechaRepo);
    accountingService = new AccountingService(new InMemoryJournalEntryRepository(), new InMemoryAccountRepository());

    productoRepo = new InMemoryProductoRepository();
    const recepcionRepo = new InMemoryRecepcionStockRepository();
    productoService = new ProductoService(productoRepo, recepcionRepo, new InMemoryAjusteStockRepository());
    const recepcionStockService = new RecepcionStockService(recepcionRepo, productoService, accountingService);
    const familiaService = new FamiliaElaboradoService(
      new InMemoryFamiliaElaboradoRepository(),
      new InMemoryVinculacionInsumoRepository(),
      productoService,
    );
    const ventaBarRepo = new InMemoryVentaBarRepository();
    const costeElaboradoService = new CosteElaboradoService(
      productoService,
      recepcionStockService,
      familiaService,
      accountingService,
      ventaBarRepo,
    );

    service = new VentaBarService(
      ventaBarRepo,
      productoService,
      costeElaboradoService,
      paseService,
      fechaService,
      accountingService,
      new NoopUnitOfWork(),
    );

    await accountingService.crearCuenta({
      nombre: 'Ingresos bar',
      code: '701001',
      type: AccountType.INCOME,
      esCuentaDeDinero: false,
    });
    await accountingService.crearCuenta({
      nombre: 'Coste de producto vendido — bar',
      code: '600001',
      type: AccountType.EXPENSE,
      esCuentaDeDinero: false,
    });
    await accountingService.crearCuenta({
      nombre: 'Stock bar',
      code: '300001',
      type: AccountType.ASSET,
      esCuentaDeDinero: false,
    });
    await accountingService.crearCuenta({
      nombre: 'Hacienda Pública, IVA repercutido',
      code: '477001',
      type: AccountType.LIABILITY,
      esCuentaDeDinero: false,
    });
    const cuentaCobro = await accountingService.crearCuenta({
      nombre: 'Caja',
      code: '570001',
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });
    cuentaCobroId = cuentaCobro.id;

    // Productos con stock y coste ya asentados, sembrados directamente (sin pasar por una
    // recepción, no hace falta para este test).
    const cocaCola = new Producto('coca-cola', 'Coca-Cola', new Decimal(2), new Decimal(1), 100, false);
    const agua = new Producto('agua', 'Agua', new Decimal('1.5'), new Decimal('0.5'), 50, false);
    await productoRepo.save(cocaCola);
    await productoRepo.save(agua);
    cocaColaId = cocaCola.id;
    aguaId = agua.id;

    const plaza = await plazaService.crear('Plaza de Prueba', 'Madrid');
    const fecha = await fechaService.crear(plaza.id, new Date('2026-07-01'), TipoActividad.SHOW);
    const pase = await paseService.crear(fecha.id, '18:00');
    paseId = pase.id;
  });

  it('crea un pedido con varios productos: un par de coste por producto + una línea de ingreso + una de cobro', async () => {
    const pedido = await service.crear(paseId, cuentaCobroId, [
      { productoId: cocaColaId, cantidad: 2 },
      { productoId: aguaId, cantidad: 1 },
    ]);

    expect(pedido.importeTotal.equals(new Decimal('5.5'))).toBe(true); // 2×2 + 1×1.5

    const cuentaIngresos = await accountingService.obtenerCuentaPorCodigo('701001');
    const cuentaCoste = await accountingService.obtenerCuentaPorCodigo('600001');
    const cuentaStock = await accountingService.obtenerCuentaPorCodigo('300001');
    expect((await accountingService.saldoPorCuenta(cuentaIngresos.id)).equals(new Decimal('5.5'))).toBe(true);
    expect((await accountingService.saldoPorCuenta(cuentaCoste.id)).equals(new Decimal('2.5'))).toBe(true); // 2×1 + 1×0.5
    expect((await accountingService.saldoPorCuenta(cuentaStock.id)).equals(new Decimal('-2.5'))).toBe(true);
    expect((await accountingService.saldoPorCuenta(cuentaCobroId)).equals(new Decimal('5.5'))).toBe(true);

    const cocaColaActualizada = await productoService.obtener(cocaColaId);
    const aguaActualizada = await productoService.obtener(aguaId);
    expect(cocaColaActualizada.cantidadActual).toBe(98);
    expect(aguaActualizada.cantidadActual).toBe(49);
    // El coste medio ponderado no se toca por una venta.
    expect(cocaColaActualizada.costeUnitarioActual.equals(new Decimal(1))).toBe(true);
  });

  it('crear() acepta tipoFiscal/ivaPercent directamente (registro retroactivo en modal)', async () => {
    const pedido = await service.crear(
      paseId,
      cuentaCobroId,
      [{ productoId: cocaColaId, cantidad: 10 }], // 20€ total
      TipoFiscal.A,
      21,
    );

    expect(pedido.tipoFiscal).toBe(TipoFiscal.A);
    expect(pedido.baseImponible!.plus(pedido.importeIva!).equals(new Decimal(20))).toBe(true);
  });

  it('el pedido tiene un único journalEntryId para todas sus líneas', async () => {
    const pedido = await service.crear(paseId, cuentaCobroId, [
      { productoId: cocaColaId, cantidad: 1 },
      { productoId: aguaId, cantidad: 1 },
    ]);
    expect(pedido.lineas).toHaveLength(2);
    expect(pedido.journalEntryId).toBeTruthy();
  });

  it('listar devuelve los pedidos del más reciente al más antiguo', async () => {
    const primero = await service.crear(paseId, cuentaCobroId, [{ productoId: cocaColaId, cantidad: 1 }]);
    // Separación real de reloj para no empatar creadoEn dentro del mismo milisegundo —
    // en producción esto nunca ocurre entre dos pedidos reales (implica dos confirmaciones
    // humanas simultáneas), solo hace falta forzarlo aquí porque el repo in-memory no tiene
    // la latencia real de una escritura a Postgres.
    await new Promise((resolve) => setTimeout(resolve, 2));
    const segundo = await service.crear(paseId, cuentaCobroId, [{ productoId: aguaId, cantidad: 1 }]);

    const pedidos = await service.listar({ paseId });

    expect(pedidos.map((p) => p.id)).toEqual([segundo.id, primero.id]);
  });

  describe('actualizar', () => {
    it('corrige la cantidad de una línea: revierte y repone el stock viejo, aplica el nuevo', async () => {
      const pedido = await service.crear(paseId, cuentaCobroId, [{ productoId: cocaColaId, cantidad: 2 }]);
      expect((await productoService.obtener(cocaColaId)).cantidadActual).toBe(98);

      const corregido = await service.actualizar(pedido.id, cuentaCobroId, [{ productoId: cocaColaId, cantidad: 5 }]);

      expect(corregido.importeTotal.equals(new Decimal(10))).toBe(true);
      expect((await productoService.obtener(cocaColaId)).cantidadActual).toBe(95);
      const cuentaIngresos = await accountingService.obtenerCuentaPorCodigo('701001');
      expect((await accountingService.saldoPorCuenta(cuentaIngresos.id)).equals(new Decimal(10))).toBe(true);
    });
  });

  it('reclasificarLote pasa a IVA A preservando el importeTotal exacto, sin tocar el stock', async () => {
    const pedido = await service.crear(paseId, cuentaCobroId, [{ productoId: cocaColaId, cantidad: 10 }]); // 20€ total
    const cantidadAntes = (await productoService.obtener(cocaColaId)).cantidadActual;

    const [reclasificado] = await service.reclasificarLote([pedido.id], TipoFiscal.A, 21);

    expect(reclasificado.tipoFiscal).toBe(TipoFiscal.A);
    expect(reclasificado.baseImponible!.plus(reclasificado.importeIva!).equals(new Decimal(20))).toBe(true);
    expect((await productoService.obtener(cocaColaId)).cantidadActual).toBe(cantidadAntes);
    const cuentaCoste = await accountingService.obtenerCuentaPorCodigo('600001');
    // El coste (10×1=10) no cambia al reclasificar — solo se reparte el lado del ingreso.
    expect((await accountingService.saldoPorCuenta(cuentaCoste.id)).equals(new Decimal(10))).toBe(true);
  });

  it('resumenPorTipoFiscal cuenta "sin clasificar" como B y separa correctamente de A', async () => {
    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const hasta = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await service.crear(paseId, cuentaCobroId, [{ productoId: cocaColaId, cantidad: 10 }]); // 20€, sin tipoFiscal
    const pedidoB = await service.crear(paseId, cuentaCobroId, [{ productoId: aguaId, cantidad: 2 }], TipoFiscal.B); // 3€, B explícito
    await service.reclasificarLote([pedidoB.id], TipoFiscal.A, 21); // 3€ pasa a A

    const resumen = await service.resumenPorTipoFiscal(desde, hasta);

    expect(resumen.countB).toBe(1);
    expect(resumen.totalB.equals(new Decimal(20))).toBe(true);
    expect(resumen.countA).toBe(1);
    expect(resumen.totalA.equals(new Decimal(3))).toBe(true);
    expect(resumen.baseA.plus(resumen.ivaA).equals(new Decimal(3))).toBe(true);
  });

  it('eliminar revierte el asiento y repone el stock de todas las líneas', async () => {
    const pedido = await service.crear(paseId, cuentaCobroId, [
      { productoId: cocaColaId, cantidad: 2 },
      { productoId: aguaId, cantidad: 1 },
    ]);

    await service.eliminar(pedido.id);

    await expect(service.obtener(pedido.id)).rejects.toThrow(/no encontrada/i);
    expect((await productoService.obtener(cocaColaId)).cantidadActual).toBe(100);
    expect((await productoService.obtener(aguaId)).cantidadActual).toBe(50);
    const cuentaIngresos = await accountingService.obtenerCuentaPorCodigo('701001');
    expect((await accountingService.saldoPorCuenta(cuentaIngresos.id)).equals(new Decimal(0))).toBe(true);
  });
});
