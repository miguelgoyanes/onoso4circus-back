import { randomUUID } from 'crypto';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmTestModule } from '../test/typeorm-test.module';
import { VentasModule } from './ventas.module';
import { ContratosIngresoController } from './api/contratos-ingreso.controller';
import { TiposEntradaController } from './api/tipos-entrada.controller';
import { VentasEntradasController } from './api/ventas-entradas.controller';
import { VentasBarController } from './api/ventas-bar.controller';
import { EstadoCobro } from './domain/estado-cobro';
import { TipoFiscal } from './domain/tipo-fiscal';
import { OrigenVenta } from './domain/origen-venta';
import { ModalidadTipoEntrada } from './domain/modalidad-tipo-entrada';
import { AccountingService } from '../accounting/application/accounting.service';
import { AccountType } from '../accounting/domain/account';
import { PlazaService } from '../plazas/application/plaza.service';
import { FechaService } from '../plazas/application/fecha.service';
import { PaseService } from '../plazas/application/pase.service';
import { TipoActividad } from '../plazas/domain/tipo-actividad';
import { ProductosController } from '../stock/api/productos.controller';
import { VentaBarService } from './application/venta-bar.service';
import { VentaEntradasService } from './application/venta-entradas.service';

describe('Ventas — Contratos (integración contra Postgres real)', () => {
  let contratosController: ContratosIngresoController;
  let accountingService: AccountingService;
  let moduleRef: import('@nestjs/testing').TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmTestModule, VentasModule],
    }).compile();
    await moduleRef.init();

    contratosController = moduleRef.get(ContratosIngresoController);
    accountingService = moduleRef.get(AccountingService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('siembra las cuentas fijas de Ventas al arrancar', async () => {
    const cuentaIngresos = await accountingService.obtenerCuentaPorCodigo('702001');
    expect(cuentaIngresos.type).toBe(AccountType.INCOME);
    const cuentaClientes = await accountingService.obtenerCuentaPorCodigo('430001');
    expect(cuentaClientes.type).toBe(AccountType.ASSET);
    const cuentaIva = await accountingService.obtenerCuentaPorCodigo('477001');
    expect(cuentaIva.type).toBe(AccountType.LIABILITY);
  });

  it('crea un contrato COBRADO con IVA repercutido, lo cobra... ya cobrado, lo edita y lo elimina', async () => {
    const testId = randomUUID();
    const cuentaDestino = await accountingService.crearCuenta({
      nombre: `Tesorería test ${testId}`,
      code: `571${testId.replace(/-/g, '').slice(0, 3)}`,
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });

    const creado = await contratosController.crear({
      cliente: `Ayuntamiento ${testId}`,
      concepto: 'Actuación de circo',
      fecha: '2026-07-01',
      estadoCobro: EstadoCobro.COBRADO,
      cuentaDestinoId: cuentaDestino.id,
      tipoFiscal: TipoFiscal.A,
      baseImponible: 1000,
      ivaPercent: 21,
    });
    expect(creado.importe).toBe('1210');
    expect(creado.importeIva).toBe('210');

    const editado = await contratosController.actualizar(creado.id, {
      cliente: `Ayuntamiento ${testId}`,
      concepto: 'Actuación de circo (fecha corregida)',
      fecha: '2026-07-02',
      tipoFiscal: TipoFiscal.A,
      baseImponible: 1200,
      ivaPercent: 21,
    });
    expect(editado.importe).toBe('1452');
    expect(editado.concepto).toBe('Actuación de circo (fecha corregida)');

    await contratosController.eliminar(creado.id);
    await expect(contratosController.obtener(creado.id)).rejects.toThrow();
  });

  it('registra un contrato PENDIENTE_COBRO y lo cobra después', async () => {
    const testId = randomUUID();
    const cuentaDestino = await accountingService.crearCuenta({
      nombre: `Tesorería test ${testId}`,
      code: `571${testId.replace(/-/g, '').slice(3, 6)}`,
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });

    const creado = await contratosController.crear({
      cliente: `Ayuntamiento ${testId}`,
      concepto: 'Actuación de circo',
      fecha: '2026-07-01',
      estadoCobro: EstadoCobro.PENDIENTE_COBRO,
      importe: 500,
    });
    expect(creado.estadoCobro).toBe(EstadoCobro.PENDIENTE_COBRO);
    expect(creado.cuentaDestinoId).toBeUndefined();

    const cobrado = await contratosController.cobrar(creado.id, { cuentaDestinoId: cuentaDestino.id });
    expect(cobrado.estadoCobro).toBe(EstadoCobro.COBRADO);
    expect(cobrado.cuentaDestinoId).toBe(cuentaDestino.id);
  });
});

describe('Ventas — Taquilla (integración contra Postgres real)', () => {
  let tiposEntradaController: TiposEntradaController;
  let ventasEntradasController: VentasEntradasController;
  let accountingService: AccountingService;
  let paseId: string;
  let cuentaCobroId: string;
  let moduleRef: import('@nestjs/testing').TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmTestModule, VentasModule],
    }).compile();
    await moduleRef.init();

    tiposEntradaController = moduleRef.get(TiposEntradaController);
    ventasEntradasController = moduleRef.get(VentasEntradasController);
    accountingService = moduleRef.get(AccountingService);

    const plazaService = moduleRef.get(PlazaService);
    const fechaService = moduleRef.get(FechaService);
    const paseService = moduleRef.get(PaseService);
    const plaza = await plazaService.crear(`Plaza test ${randomUUID()}`, 'Madrid');
    const fecha = await fechaService.crear(plaza.id, new Date('2026-07-01'), TipoActividad.SHOW);
    const pase = await paseService.crear(fecha.id, '18:00');
    paseId = pase.id;

    const testId = randomUUID();
    const cuentaCobro = await accountingService.crearCuenta({
      nombre: `Caja test ${testId}`,
      code: `571${testId.replace(/-/g, '').slice(0, 3)}`,
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });
    cuentaCobroId = cuentaCobro.id;
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('siembra las cuentas fijas de Taquilla al arrancar', async () => {
    const cuentaIngresos = await accountingService.obtenerCuentaPorCodigo('700001');
    expect(cuentaIngresos.type).toBe(AccountType.INCOME);
  });

  it('crea un tipo de entrada, registra un lote, lo edita, reclasifica IVA en lote y elimina', async () => {
    const tipoEntrada = await tiposEntradaController.crear({
      nombre: `General ${randomUUID()}`,
      precio: 10,
      aplicaIva: false,
      modalidad: ModalidadTipoEntrada.PRESENCIAL,
    });

    const [venta] = await ventasEntradasController.crearLote({
      paseId,
      lineas: [{ tipoEntradaId: tipoEntrada.id, cantidad: 4, cuentaCobroId, origen: OrigenVenta.FISICA }],
    });
    expect(venta.precioUnitarioAplicado).toBe('10');

    const editada = await ventasEntradasController.actualizar(venta.id, {
      tipoEntradaId: tipoEntrada.id,
      cantidad: 5,
      cuentaCobroId,
      origen: OrigenVenta.FISICA,
    });
    expect(editada.cantidad).toBe(5);

    const [reclasificada] = await ventasEntradasController.reclasificarLote({
      ids: [venta.id],
      tipoFiscal: TipoFiscal.A,
      ivaPercent: 21,
    });
    expect(reclasificada.tipoFiscal).toBe(TipoFiscal.A);

    await expect(tiposEntradaController.eliminar(tipoEntrada.id)).rejects.toThrow();

    await ventasEntradasController.eliminar(venta.id);
    await expect(ventasEntradasController.obtener(venta.id)).rejects.toThrow();
    await tiposEntradaController.eliminar(tipoEntrada.id);
  });

  it('reclasificarLote revierte TODO el lote si un id a mitad no existe (transacción real)', async () => {
    const tipoEntrada = await tiposEntradaController.crear({
      nombre: `General ${randomUUID()}`,
      precio: 10,
      aplicaIva: false,
      modalidad: ModalidadTipoEntrada.PRESENCIAL,
    });

    const [ventaA] = await ventasEntradasController.crearLote({
      paseId,
      lineas: [{ tipoEntradaId: tipoEntrada.id, cantidad: 2, cuentaCobroId, origen: OrigenVenta.FISICA }],
    });
    const [ventaB] = await ventasEntradasController.crearLote({
      paseId,
      lineas: [{ tipoEntradaId: tipoEntrada.id, cantidad: 3, cuentaCobroId, origen: OrigenVenta.FISICA }],
    });
    expect(ventaA.tipoFiscal).toBeUndefined();
    expect(ventaB.tipoFiscal).toBeUndefined();

    const ventaEntradasService = moduleRef.get(VentaEntradasService);
    const journalEntryIdAAntes = (await ventaEntradasService.obtener(ventaA.id)).journalEntryId;
    const journalEntryIdBAntes = (await ventaEntradasService.obtener(ventaB.id)).journalEntryId;

    // ventaA va ANTES del id inexistente en la lista — si no hubiera transacción real, ventaA
    // ya habría quedado reclasificada a A cuando el bucle revienta en el id falso.
    await expect(
      ventasEntradasController.reclasificarLote({
        ids: [ventaA.id, randomUUID(), ventaB.id],
        tipoFiscal: TipoFiscal.A,
        ivaPercent: 21,
      }),
    ).rejects.toThrow();

    const ventaATrasFallo = await ventasEntradasController.obtener(ventaA.id);
    const ventaBTrasFallo = await ventasEntradasController.obtener(ventaB.id);
    expect(ventaATrasFallo.tipoFiscal).toBeUndefined();
    expect(ventaBTrasFallo.tipoFiscal).toBeUndefined();
    expect((await ventaEntradasService.obtener(ventaA.id)).journalEntryId).toBe(journalEntryIdAAntes);
    expect((await ventaEntradasService.obtener(ventaB.id)).journalEntryId).toBe(journalEntryIdBAntes);

    await ventasEntradasController.eliminar(ventaA.id);
    await ventasEntradasController.eliminar(ventaB.id);
    await tiposEntradaController.eliminar(tipoEntrada.id);
  });
});

describe('Ventas — Bar (integración contra Postgres real)', () => {
  let productosController: ProductosController;
  let ventasBarController: VentasBarController;
  let accountingService: AccountingService;
  let paseId: string;
  let cuentaCobroId: string;
  let moduleRef: import('@nestjs/testing').TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmTestModule, VentasModule],
    }).compile();
    await moduleRef.init();

    productosController = moduleRef.get(ProductosController);
    ventasBarController = moduleRef.get(VentasBarController);
    accountingService = moduleRef.get(AccountingService);

    const plazaService = moduleRef.get(PlazaService);
    const fechaService = moduleRef.get(FechaService);
    const paseService = moduleRef.get(PaseService);
    const plaza = await plazaService.crear(`Plaza test ${randomUUID()}`, 'Madrid');
    const fecha = await fechaService.crear(plaza.id, new Date('2026-07-01'), TipoActividad.SHOW);
    const pase = await paseService.crear(fecha.id, '18:00');
    paseId = pase.id;

    // Código de 6 hex (16M combinaciones) en vez de 3 (4096) — la tabla de cuentas es la
    // misma BD real entre ejecuciones de test y con solo 3 dígitos las colisiones entre los
    // distintos describe de este fichero (Contratos/Taquilla/Bar) eran demasiado probables.
    const testId = randomUUID();
    const cuentaCobro = await accountingService.crearCuenta({
      nombre: `Caja test ${testId}`,
      code: `57${testId.replace(/-/g, '').slice(0, 4)}`,
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });
    cuentaCobroId = cuentaCobro.id;
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('siembra las cuentas fijas de Bar al arrancar', async () => {
    const cuentaIngresos = await accountingService.obtenerCuentaPorCodigo('701001');
    expect(cuentaIngresos.type).toBe(AccountType.INCOME);
    const cuentaCoste = await accountingService.obtenerCuentaPorCodigo('600001');
    expect(cuentaCoste.type).toBe(AccountType.EXPENSE);
  });

  it('registra un pedido con dos productos, lo edita, reclasifica IVA en lote y elimina', async () => {
    const cocaCola = await productosController.crear({
      nombre: `Coca-Cola ${randomUUID()}`,
      precioVentaPublico: 2,
      aplicaIva: false,
    });
    const agua = await productosController.crear({
      nombre: `Agua ${randomUUID()}`,
      precioVentaPublico: 1.5,
      aplicaIva: false,
    });

    const pedido = await ventasBarController.crear({
      paseId,
      cuentaCobroId,
      lineas: [
        { productoId: cocaCola.id, cantidad: 2 },
        { productoId: agua.id, cantidad: 1 },
      ],
    });
    expect(pedido.importeTotal).toBe('5.5');
    expect(pedido.lineas).toHaveLength(2);

    const editado = await ventasBarController.actualizar(pedido.id, {
      cuentaCobroId,
      lineas: [{ productoId: cocaCola.id, cantidad: 5 }],
    });
    expect(editado.importeTotal).toBe('10');

    const [reclasificado] = await ventasBarController.reclasificarLote({
      ids: [editado.id],
      tipoFiscal: TipoFiscal.A,
      ivaPercent: 21,
    });
    expect(reclasificado.tipoFiscal).toBe(TipoFiscal.A);

    await ventasBarController.eliminar(pedido.id);
    await expect(ventasBarController.obtener(pedido.id)).rejects.toThrow();
  });

  it('reclasificarLote revierte TODO el lote si un id a mitad no existe (transacción real)', async () => {
    const producto = await productosController.crear({
      nombre: `Agua ${randomUUID()}`,
      precioVentaPublico: 1,
      aplicaIva: false,
    });

    const pedidoA = await ventasBarController.crear({
      paseId,
      cuentaCobroId,
      lineas: [{ productoId: producto.id, cantidad: 3 }],
    });
    const pedidoB = await ventasBarController.crear({
      paseId,
      cuentaCobroId,
      lineas: [{ productoId: producto.id, cantidad: 4 }],
    });
    expect(pedidoA.tipoFiscal).toBeUndefined();
    expect(pedidoB.tipoFiscal).toBeUndefined();

    const ventaBarService = moduleRef.get(VentaBarService);
    const journalEntryIdAAntes = (await ventaBarService.obtener(pedidoA.id)).journalEntryId;
    const journalEntryIdBAntes = (await ventaBarService.obtener(pedidoB.id)).journalEntryId;

    // pedidoA va ANTES del id inexistente en la lista — si no hubiera transacción real,
    // pedidoA ya habría quedado reclasificado a A cuando el bucle revienta en el id falso.
    await expect(
      ventasBarController.reclasificarLote({
        ids: [pedidoA.id, randomUUID(), pedidoB.id],
        tipoFiscal: TipoFiscal.A,
        ivaPercent: 21,
      }),
    ).rejects.toThrow();

    const pedidoATrasFallo = await ventasBarController.obtener(pedidoA.id);
    const pedidoBTrasFallo = await ventasBarController.obtener(pedidoB.id);
    expect(pedidoATrasFallo.tipoFiscal).toBeUndefined();
    expect(pedidoBTrasFallo.tipoFiscal).toBeUndefined();

    // El journalEntryId no cambió — el asiento original sigue siendo el mismo, no se borró
    // ni se sustituyó por uno nuevo a medio camino.
    expect((await ventaBarService.obtener(pedidoA.id)).journalEntryId).toBe(journalEntryIdAAntes);
    expect((await ventaBarService.obtener(pedidoB.id)).journalEntryId).toBe(journalEntryIdBAntes);

    await ventasBarController.eliminar(pedidoA.id);
    await ventasBarController.eliminar(pedidoB.id);
  });
});
