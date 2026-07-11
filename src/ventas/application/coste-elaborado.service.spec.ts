import Decimal from 'decimal.js';
import { randomUUID } from 'crypto';
import { Producto } from '../../stock/domain/producto';
import { ProductoRepository } from '../../stock/application/producto.repository';
import { RecepcionStock } from '../../stock/domain/recepcion-stock';
import { RecepcionStockRepository } from '../../stock/application/recepcion-stock.repository';
import { AjusteStock } from '../../stock/domain/ajuste-stock';
import { AjusteStockRepository } from '../../stock/application/ajuste-stock.repository';
import { FamiliaElaborado } from '../../stock/domain/familia-elaborado';
import { FamiliaElaboradoRepository } from '../../stock/application/familia-elaborado.repository';
import { VinculacionInsumo } from '../../stock/domain/vinculacion-insumo';
import { VinculacionInsumoRepository } from '../../stock/application/vinculacion-insumo.repository';
import { TipoProducto } from '../../stock/domain/tipo-producto';
import { ProductoService } from '../../stock/application/producto.service';
import { RecepcionStockService } from '../../stock/application/recepcion-stock.service';
import { FamiliaElaboradoService } from '../../stock/application/familia-elaborado.service';
import { VentaBar, VentaBarLinea } from '../domain/venta-bar';
import { VentaBarRepository } from './venta-bar.repository';
import { InMemoryVentaBarRepository } from '../infrastructure/in-memory-venta-bar.repository';
import { AccountingService } from '../../accounting/application/accounting.service';
import { InMemoryJournalEntryRepository } from '../../accounting/infrastructure/in-memory-journal-entry.repository';
import { InMemoryAccountRepository } from '../../accounting/infrastructure/in-memory-account.repository';
import { AccountType } from '../../accounting/domain/account';
import { CosteElaboradoService } from './coste-elaborado.service';

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
  async save(): Promise<void> {}
  async findById(): Promise<AjusteStock | null> {
    return null;
  }
  async findAll(): Promise<AjusteStock[]> {
    return [];
  }
  async existeConProducto(): Promise<boolean> {
    return false;
  }
  async delete(): Promise<void> {}
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

function ventaDe(fecha: Date, lineas: { productoId: string; cantidad: number }[]): VentaBar {
  return new VentaBar({
    id: randomUUID(),
    paseId: 'pase-1',
    fechaId: 'fecha-1',
    plazaId: 'plaza-1',
    cuentaCobroId: 'cuenta-cobro-1',
    creadoEn: fecha,
    lineas: lineas.map((l) => new VentaBarLinea(l.productoId, l.cantidad, new Decimal(3), new Decimal(0))),
    importeTotal: new Decimal(0),
    journalEntryId: 'je-1',
  });
}

describe('CosteElaboradoService', () => {
  let accountingService: AccountingService;
  let productoService: ProductoService;
  let recepcionStockService: RecepcionStockService;
  let familiaService: FamiliaElaboradoService;
  let ventaBarRepo: VentaBarRepository;
  let service: CosteElaboradoService;
  let cuentaOrigenId: string;

  beforeEach(async () => {
    accountingService = new AccountingService(new InMemoryJournalEntryRepository(), new InMemoryAccountRepository());
    await accountingService.crearCuenta({ nombre: 'Stock', code: '300001', type: AccountType.ASSET, esCuentaDeDinero: false });
    await accountingService.crearCuenta({
      nombre: 'Coste de producto vendido',
      code: '600001',
      type: AccountType.EXPENSE,
      esCuentaDeDinero: false,
    });
    const cuentaOrigen = await accountingService.crearCuenta({
      nombre: 'Tesorería',
      code: '570001',
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });
    cuentaOrigenId = cuentaOrigen.id;

    const recepcionRepo = new InMemoryRecepcionStockRepository();
    productoService = new ProductoService(new InMemoryProductoRepository(), recepcionRepo, new InMemoryAjusteStockRepository());
    recepcionStockService = new RecepcionStockService(recepcionRepo, productoService, accountingService);
    familiaService = new FamiliaElaboradoService(
      new InMemoryFamiliaElaboradoRepository(),
      new InMemoryVinculacionInsumoRepository(),
      productoService,
    );
    ventaBarRepo = new InMemoryVentaBarRepository();
    service = new CosteElaboradoService(productoService, recepcionStockService, familiaService, accountingService, ventaBarRepo);
  });

  async function crearLote(insumoId: string, costeTotal: number, fecha: Date): Promise<RecepcionStock> {
    return recepcionStockService.crear({
      productoId: insumoId,
      cantidad: 1,
      costeUnitario: costeTotal,
      fecha,
      cuentaOrigenId,
    });
  }

  it('coste aproximado es cero antes de cerrar ningún lote', async () => {
    const familia = await familiaService.crear('Palomitas');
    const maiz = await productoService.crear('Maíz', new Decimal(0), false, TipoProducto.INSUMO);
    await familiaService.vincularInsumo(familia.id, maiz.id);
    const pequena = await productoService.crear(
      'Palomita pequeña',
      new Decimal(2),
      true,
      TipoProducto.ELABORADO,
      familia.id,
      new Decimal(1),
    );

    expect((await service.costeAproximado(pequena.id)).equals(new Decimal(0))).toBe(true);
  });

  it('iniciarUsoLote sin lote anterior activo: no postea ningún asiento de cierre', async () => {
    const maiz = await productoService.crear('Maíz', new Decimal(0), false, TipoProducto.INSUMO);
    const lote = await crearLote(maiz.id, 20, new Date('2026-07-01'));

    const abierto = await service.iniciarUsoLote(lote.id, new Date('2026-07-01T09:00:00Z'));

    expect(abierto.fechaInicioUso).not.toBeNull();
    expect(abierto.cierreJournalEntryId ?? null).toBeNull();
  });

  it('al cerrar un lote sin ventas durante su ventana, no reconoce coste ni actualiza la media', async () => {
    const familia = await familiaService.crear('Palomitas');
    const maiz = await productoService.crear('Maíz', new Decimal(0), false, TipoProducto.INSUMO);
    await familiaService.vincularInsumo(familia.id, maiz.id);
    await productoService.crear('Palomita pequeña', new Decimal(2), true, TipoProducto.ELABORADO, familia.id, new Decimal(1));

    const lote1 = await crearLote(maiz.id, 20, new Date('2026-07-01'));
    await service.iniciarUsoLote(lote1.id, new Date('2026-07-01T09:00:00Z'));
    // Sin ventas de por medio.
    const lote2 = await crearLote(maiz.id, 25, new Date('2026-07-10'));
    await service.iniciarUsoLote(lote2.id, new Date('2026-07-10T09:00:00Z'));

    const maizActualizado = await productoService.obtener(maiz.id);
    expect(maizActualizado.costeUnitarioActual.equals(new Decimal(0))).toBe(true);
    expect(maizActualizado.cantidadActual).toBe(0);
  });

  it('cierra un lote con ventas: asienta el coste exacto repartido por elaborado y actualiza la media del insumo', async () => {
    const familia = await familiaService.crear('Palomitas');
    const maiz = await productoService.crear('Maíz', new Decimal(0), false, TipoProducto.INSUMO);
    await familiaService.vincularInsumo(familia.id, maiz.id);
    const pequena = await productoService.crear(
      'Palomita pequeña',
      new Decimal(2),
      true,
      TipoProducto.ELABORADO,
      familia.id,
      new Decimal(1),
    );
    const grande = await productoService.crear(
      'Palomita grande',
      new Decimal(3.5),
      true,
      TipoProducto.ELABORADO,
      familia.id,
      new Decimal(2),
    );

    const lote1 = await crearLote(maiz.id, 20, new Date('2026-07-01'));
    await service.iniciarUsoLote(lote1.id, new Date('2026-07-01T09:00:00Z'));

    // Ventas ANTES de abrir el lote no deben contar.
    await ventaBarRepo.save(ventaDe(new Date('2026-06-30T09:00:00Z'), [{ productoId: pequena.id, cantidad: 999 }]));
    // 3 pequeñas + 2 grandes → 3×1 + 2×2 = 7 unidades equivalentes.
    await ventaBarRepo.save(
      ventaDe(new Date('2026-07-02T10:00:00Z'), [
        { productoId: pequena.id, cantidad: 3 },
        { productoId: grande.id, cantidad: 2 },
      ]),
    );

    const lote2 = await crearLote(maiz.id, 30, new Date('2026-07-10'));
    // Al abrir lote2 se cierra lote1 con TODO lo vendido en su ventana (20€ / 7 = 2.8571...).
    await service.iniciarUsoLote(lote2.id, new Date('2026-07-10T09:00:00Z'));

    // Asiento de cierre: debit 600001 (pequeña + grande), credit 300001 (maíz) = 20€ exactos.
    // La cuenta de stock lleva +20 (compra lote1) +30 (compra lote2, ya registrada) -20
    // (cierre de lote1, reconocido exacto) = 30 — el lote1 queda del todo saldado (compró 20,
    // reconoció 20), y lo que resta es exactamente lote2, que sigue sin cerrar.
    const cuentaCoste = await accountingService.obtenerCuentaPorCodigo('600001');
    const cuentaStock = await accountingService.obtenerCuentaPorCodigo('300001');
    expect((await accountingService.saldoPorCuenta(cuentaCoste.id)).equals(new Decimal(20))).toBe(true);
    expect((await accountingService.saldoPorCuenta(cuentaStock.id)).equals(new Decimal(30))).toBe(true);

    const lote1Cerrado = await recepcionStockService.obtener(lote1.id);
    expect(lote1Cerrado.cierreJournalEntryId).toBeTruthy();

    // Media del insumo tras el primer cierre: 20€ repartidos entre 7 unidades equivalentes.
    const maizActualizado = await productoService.obtener(maiz.id);
    expect(maizActualizado.cantidadActual).toBe(7);
    expect(maizActualizado.costeUnitarioActual.equals(new Decimal('2.8571'))).toBe(true);

    // Coste aproximado ahora disponible (antes del segundo cierre, basado en lote1 ya cerrado).
    const costePequena = await service.costeAproximado(pequena.id);
    const costeGrande = await service.costeAproximado(grande.id);
    expect(costePequena.equals(new Decimal('2.86'))).toBe(true); // 2.8571×1 → 2dp
    expect(costeGrande.equals(new Decimal('5.71'))).toBe(true); // 2.8571×2 → 2dp
  });

  it('caso límite: borrar el lote que cerró a otro no permite volver a cerrarlo al abrir uno nuevo', async () => {
    const familia = await familiaService.crear('Palomitas');
    const maiz = await productoService.crear('Maíz', new Decimal(0), false, TipoProducto.INSUMO);
    await familiaService.vincularInsumo(familia.id, maiz.id);
    const pequena = await productoService.crear(
      'Palomita pequeña',
      new Decimal(2),
      true,
      TipoProducto.ELABORADO,
      familia.id,
      new Decimal(1),
    );

    const lote1 = await crearLote(maiz.id, 20, new Date('2026-07-01'));
    await service.iniciarUsoLote(lote1.id, new Date('2026-07-01T09:00:00Z'));
    await ventaBarRepo.save(ventaDe(new Date('2026-07-02T09:00:00Z'), [{ productoId: pequena.id, cantidad: 10 }]));

    const lote2 = await crearLote(maiz.id, 30, new Date('2026-07-10'));
    await service.iniciarUsoLote(lote2.id, new Date('2026-07-10T09:00:00Z')); // cierra lote1: 20/10=2
    const maizTrasCierre1 = await productoService.obtener(maiz.id);
    expect(maizTrasCierre1.costeUnitarioActual.equals(new Decimal(2))).toBe(true);

    // lote2 nunca se cerró él mismo — borrarlo está permitido (no toca lote1, ya historia).
    await recepcionStockService.eliminar(lote2.id);
    expect(await recepcionStockService.loteActivo(maiz.id)).toBeNull();

    // Abrir un lote3 no debe volver a cerrar lote1 (ya cerrado) ni duplicar su coste.
    const lote3 = await crearLote(maiz.id, 40, new Date('2026-07-20'));
    await service.iniciarUsoLote(lote3.id, new Date('2026-07-20T09:00:00Z'));

    const maizTrasLote3 = await productoService.obtener(maiz.id);
    expect(maizTrasLote3.costeUnitarioActual.equals(new Decimal(2))).toBe(true); // sin cambios
    expect(maizTrasLote3.cantidadActual).toBe(10); // sin cambios

    const cuentaCoste = await accountingService.obtenerCuentaPorCodigo('600001');
    expect((await accountingService.saldoPorCuenta(cuentaCoste.id)).equals(new Decimal(20))).toBe(true); // no 40
  });

  it('un segundo cierre hace una media ponderada con el primero (estilo PMP)', async () => {
    const familia = await familiaService.crear('Palomitas');
    const maiz = await productoService.crear('Maíz', new Decimal(0), false, TipoProducto.INSUMO);
    await familiaService.vincularInsumo(familia.id, maiz.id);
    const pequena = await productoService.crear(
      'Palomita pequeña',
      new Decimal(2),
      true,
      TipoProducto.ELABORADO,
      familia.id,
      new Decimal(1),
    );

    const lote1 = await crearLote(maiz.id, 20, new Date('2026-07-01'));
    await service.iniciarUsoLote(lote1.id, new Date('2026-07-01T09:00:00Z'));
    await ventaBarRepo.save(ventaDe(new Date('2026-07-02T09:00:00Z'), [{ productoId: pequena.id, cantidad: 10 }]));

    const lote2 = await crearLote(maiz.id, 30, new Date('2026-07-10'));
    await service.iniciarUsoLote(lote2.id, new Date('2026-07-10T09:00:00Z')); // cierra lote1: 20/10=2

    await ventaBarRepo.save(ventaDe(new Date('2026-07-11T09:00:00Z'), [{ productoId: pequena.id, cantidad: 5 }]));
    const lote3 = await crearLote(maiz.id, 10, new Date('2026-07-20'));
    await service.iniciarUsoLote(lote3.id, new Date('2026-07-20T09:00:00Z')); // cierra lote2: 30/5=6

    // Media ponderada: (10×2 + 5×6) / 15 = (20+30)/15 = 3.3333...
    const maizActualizado = await productoService.obtener(maiz.id);
    expect(maizActualizado.cantidadActual).toBe(15);
    expect(maizActualizado.costeUnitarioActual.equals(new Decimal('3.3333'))).toBe(true);
  });
});
