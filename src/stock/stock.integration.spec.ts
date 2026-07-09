import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmTestModule } from '../test/typeorm-test.module';
import { StockModule } from './stock.module';
import { ProductosController } from './api/productos.controller';
import { RecepcionesStockController } from './api/recepciones-stock.controller';
import { AjustesStockController } from './api/ajustes-stock.controller';
import { PRODUCTOS_UPLOAD_DIR, PRODUCTOS_UPLOAD_PREFIX } from './api/producto-imagen.storage';
import { TipoAjusteStock } from './domain/tipo-ajuste-stock';
import { AccountingService } from '../accounting/application/accounting.service';
import { AccountType } from '../accounting/domain/account';

function archivoFalso(nombre: string): Express.Multer.File {
  if (!existsSync(PRODUCTOS_UPLOAD_DIR)) mkdirSync(PRODUCTOS_UPLOAD_DIR, { recursive: true });
  const ruta = join(PRODUCTOS_UPLOAD_DIR, nombre);
  writeFileSync(ruta, 'contenido de prueba');
  return { filename: nombre, path: ruta } as Express.Multer.File;
}

describe('Stock (integración contra Postgres real)', () => {
  let productosController: ProductosController;
  let recepcionesController: RecepcionesStockController;
  let ajustesController: AjustesStockController;
  let accountingService: AccountingService;
  let moduleRef: import('@nestjs/testing').TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmTestModule, StockModule],
    }).compile();
    await moduleRef.init();

    productosController = moduleRef.get(ProductosController);
    recepcionesController = moduleRef.get(RecepcionesStockController);
    ajustesController = moduleRef.get(AjustesStockController);
    accountingService = moduleRef.get(AccountingService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('siembra las cuentas fijas de Stock al arrancar', async () => {
    const cuentaStock = await accountingService.obtenerCuentaPorCodigo('300001');
    expect(cuentaStock.type).toBe(AccountType.ASSET);
    const cuentaMermas = await accountingService.obtenerCuentaPorCodigo('606001');
    expect(cuentaMermas.type).toBe(AccountType.EXPENSE);
  });

  it('crea un producto, registra una recepción y actualiza cantidad/coste', async () => {
    const testId = randomUUID();
    const producto = await productosController.crear({
      nombre: `Coca-Cola ${testId}`,
      precioVentaPublico: 2,
      aplicaIva: true,
    });
    expect(producto.cantidadActual).toBe(0);

    const cuentaOrigen = await accountingService.crearCuenta({
      nombre: `Tesorería test ${testId}`,
      code: `571${testId.replace(/-/g, '').slice(0, 3)}`,
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });

    const recepcion = await recepcionesController.crear({
      productoId: producto.id,
      cantidad: 24,
      costeUnitario: 0.5,
      fecha: '2026-07-10',
      cuentaOrigenId: cuentaOrigen.id,
    });
    expect(recepcion.productoNombre).toBe(`Coca-Cola ${testId}`);

    const actualizado = await productosController.obtener(producto.id);
    expect(actualizado.cantidadActual).toBe(24);
    expect(actualizado.costeUnitarioActual).toBe('0.5');

    const saldoOrigen = await accountingService.saldoPorCuenta(cuentaOrigen.id);
    expect(saldoOrigen.toString()).toBe('-12');
  });

  it('registra un ajuste de merma, decrementa cantidad y postea el coste', async () => {
    const testId = randomUUID();
    const producto = await productosController.crear({
      nombre: `Palomitas ${testId}`,
      precioVentaPublico: 3,
      aplicaIva: true,
    });
    const cuentaOrigen = await accountingService.crearCuenta({
      nombre: `Tesorería test ${testId}`,
      code: `571${testId.replace(/-/g, '').slice(3, 6)}`,
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });
    await recepcionesController.crear({
      productoId: producto.id,
      cantidad: 10,
      costeUnitario: 1,
      fecha: '2026-07-10',
      cuentaOrigenId: cuentaOrigen.id,
    });

    const ajuste = await ajustesController.crear({
      productoId: producto.id,
      tipo: TipoAjusteStock.MERMA,
      cantidad: 3,
      fecha: '2026-07-10',
    });
    expect(ajuste.costeUnitarioAplicado).toBe('1');

    const actualizado = await productosController.obtener(producto.id);
    expect(actualizado.cantidadActual).toBe(7);
  });

  it('recalcula el coste como media ponderada tras varias entradas y salidas', async () => {
    const testId = randomUUID();
    const producto = await productosController.crear({
      nombre: `Coca-Cola ${testId}`,
      precioVentaPublico: 2,
      aplicaIva: true,
    });
    const cuentaOrigen = await accountingService.crearCuenta({
      nombre: `Tesorería test ${testId}`,
      code: `571${testId.replace(/-/g, '').slice(6, 9)}`,
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });

    await recepcionesController.crear({
      productoId: producto.id,
      cantidad: 190,
      costeUnitario: 1,
      fecha: '2026-07-01',
      cuentaOrigenId: cuentaOrigen.id,
    });
    let actual = await productosController.obtener(producto.id);
    expect(actual.cantidadActual).toBe(190);
    expect(actual.costeUnitarioActual).toBe('1');

    await ajustesController.crear({
      productoId: producto.id,
      tipo: TipoAjusteStock.MERMA,
      cantidad: 5,
      fecha: '2026-07-02',
    });
    actual = await productosController.obtener(producto.id);
    expect(actual.cantidadActual).toBe(185);
    expect(actual.costeUnitarioActual).toBe('1'); // una salida nunca mueve la media

    await recepcionesController.crear({
      productoId: producto.id,
      cantidad: 12,
      costeUnitario: 2,
      fecha: '2026-07-03',
      cuentaOrigenId: cuentaOrigen.id,
    });
    actual = await productosController.obtener(producto.id);
    // (185×1 + 12×2) / 197 = 209/197 = 1.0609... → 1.06
    expect(actual.cantidadActual).toBe(197);
    expect(actual.costeUnitarioActual).toBe('1.06');
  });

  it('ordena por la fecha+hora que indica el usuario en cada movimiento, no por el orden en que se registraron', async () => {
    const testId = randomUUID();
    const producto = await productosController.crear({
      nombre: `Coca-Cola ${testId}`,
      precioVentaPublico: 2,
      aplicaIva: true,
    });
    const cuentaOrigen = await accountingService.crearCuenta({
      nombre: `Tesorería test ${testId}`,
      code: `571${testId.replace(/-/g, '').slice(9, 12)}`,
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });

    // Las tres comparten el mismo día pero cada una lleva su propia hora, fijada por el
    // usuario — y encima se registran "al revés" (la más tardía primero) para comprobar
    // que manda la fecha+hora indicada, no el orden real de creación.
    await recepcionesController.crear({
      productoId: producto.id,
      cantidad: 10,
      costeUnitario: 3,
      fecha: '2026-07-08T18:00:00.000Z',
      cuentaOrigenId: cuentaOrigen.id,
    });
    await ajustesController.crear({
      productoId: producto.id,
      tipo: TipoAjusteStock.MERMA,
      cantidad: 10,
      fecha: '2026-07-08T12:00:00.000Z',
    });
    await recepcionesController.crear({
      productoId: producto.id,
      cantidad: 100,
      costeUnitario: 1,
      fecha: '2026-07-08T09:00:00.000Z',
      cuentaOrigenId: cuentaOrigen.id,
    });

    const actual = await productosController.obtener(producto.id);
    expect(actual.cantidadActual).toBe(100);
    // Orden real (por fecha, no por creación): +100@1 (saldo 100) → -10 (saldo 90) →
    // +10@3 (saldo 100) → media = (90×1 + 10×3) / 100 = 1.2

    expect(actual.costeUnitarioActual).toBe('1.2');
  });

  it('caso reportado: dos movimientos en el MISMO minuto ordenan por el momento real de guardado, no por tipo', async () => {
    const testId = randomUUID();
    const producto = await productosController.crear({
      nombre: `Coca-Cola ${testId}`,
      precioVentaPublico: 2,
      aplicaIva: true,
    });
    const cuentaOrigen = await accountingService.crearCuenta({
      nombre: `Tesorería test ${testId}`,
      code: `571${testId.replace(/-/g, '').slice(0, 3)}`,
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });

    // El selector de fecha solo tiene precisión de minuto — el usuario no puede elegir
    // segundos. Aquí el ajuste y la segunda recepción comparten exactamente el mismo
    // minuto (09:15); el backend debe desempatar por el instante real en que se guardó
    // cada uno (sellado automáticamente), no por si es una recepción o un ajuste.
    await recepcionesController.crear({
      productoId: producto.id,
      cantidad: 100,
      costeUnitario: 1,
      fecha: '2026-07-08T09:14:00.000Z',
      cuentaOrigenId: cuentaOrigen.id,
    });
    await ajustesController.crear({
      productoId: producto.id,
      tipo: TipoAjusteStock.MERMA,
      cantidad: 10,
      fecha: '2026-07-08T09:15:00.000Z',
    });
    await recepcionesController.crear({
      productoId: producto.id,
      cantidad: 10,
      costeUnitario: 3,
      fecha: '2026-07-08T09:15:00.000Z',
      cuentaOrigenId: cuentaOrigen.id,
    });

    const actual = await productosController.obtener(producto.id);
    expect(actual.cantidadActual).toBe(100);
    // Orden real de guardado: +100@1 (saldo 100) → -10 (saldo 90) → +10@3 (saldo 100) →
    // media = (90×1 + 10×3) / 100 = 1.2 — si el ajuste se hubiera colado después de las
    // dos recepciones (por empatar el minuto), el resultado habría sido distinto.
    expect(actual.costeUnitarioActual).toBe('1.2');
  });

  it('eliminar un producto sin movimientos funciona; con movimientos se rechaza', async () => {
    const testId = randomUUID();
    const sinMovimientos = await productosController.crear({
      nombre: `Sin uso ${testId}`,
      precioVentaPublico: 1,
      aplicaIva: false,
    });
    await expect(productosController.eliminar(sinMovimientos.id)).resolves.toEqual({ ok: true });

    const conMovimientos = await productosController.crear({
      nombre: `Con uso ${testId}`,
      precioVentaPublico: 1,
      aplicaIva: false,
    });
    const cuentaOrigen = await accountingService.crearCuenta({
      nombre: `Tesorería test ${testId}`,
      code: `571${testId.replace(/-/g, '').slice(6, 9)}`,
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });
    await recepcionesController.crear({
      productoId: conMovimientos.id,
      cantidad: 5,
      costeUnitario: 1,
      fecha: '2026-07-10',
      cuentaOrigenId: cuentaOrigen.id,
    });

    await expect(productosController.eliminar(conMovimientos.id)).rejects.toThrow(/movimientos de stock/i);
  });

  it('sube una imagen de producto y borra la anterior al reemplazarla', async () => {
    const testId = randomUUID();
    const producto = await productosController.crear({
      nombre: `Con foto ${testId}`,
      precioVentaPublico: 2,
      aplicaIva: false,
    });

    const primeraImagen = archivoFalso(`${testId}-1.jpg`);
    const actualizado1 = await productosController.subirImagen(producto.id, primeraImagen);
    expect(actualizado1.imagenUrl).toBe(`${PRODUCTOS_UPLOAD_PREFIX}/${testId}-1.jpg`);
    expect(existsSync(primeraImagen.path)).toBe(true);

    const segundaImagen = archivoFalso(`${testId}-2.jpg`);
    const actualizado2 = await productosController.subirImagen(producto.id, segundaImagen);
    expect(actualizado2.imagenUrl).toBe(`${PRODUCTOS_UPLOAD_PREFIX}/${testId}-2.jpg`);
    expect(existsSync(primeraImagen.path)).toBe(false);
    expect(existsSync(segundaImagen.path)).toBe(true);
  });

  it('rechaza subirImagen sin archivo', async () => {
    const testId = randomUUID();
    const producto = await productosController.crear({
      nombre: `Sin archivo ${testId}`,
      precioVentaPublico: 2,
      aplicaIva: false,
    });
    await expect(productosController.subirImagen(producto.id, undefined)).rejects.toThrow(/falta el archivo/i);
  });
});
