import { randomUUID } from 'crypto';
import { ConflictException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmTestModule } from '../test/typeorm-test.module';
import { ActivosModule } from './activos.module';
import { ActivosController } from './api/activos.controller';
import { CategoriasActivoController } from './api/categorias-activo.controller';
import { TipoFiscal } from './domain/tipo-fiscal';
import { AccountingService } from '../accounting/application/accounting.service';
import { AccountType } from '../accounting/domain/account';

function haceMeses(meses: number): Date {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - meses);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

describe('Activos (integración contra Postgres real)', () => {
  let activosController: ActivosController;
  let categoriasController: CategoriasActivoController;
  let accountingService: AccountingService;
  let moduleRef: import('@nestjs/testing').TestingModule;
  let cuentaPagoId: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmTestModule, ActivosModule],
    }).compile();
    await moduleRef.init();

    activosController = moduleRef.get(ActivosController);
    categoriasController = moduleRef.get(CategoriasActivoController);
    accountingService = moduleRef.get(AccountingService);

    const testId = randomUUID().replace(/-/g, '').slice(0, 3);
    const cuentaPago = await accountingService.crearCuenta({
      nombre: `Caja test ${testId}`,
      code: `570${testId}`,
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });
    cuentaPagoId = cuentaPago.id;
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('siembra las categorías predefinidas al arrancar', async () => {
    const categorias = await categoriasController.listar();
    const nombres = categorias.map((c) => c.nombre);
    expect(nombres).toEqual(
      expect.arrayContaining(['Carpa y estructura', 'Mobiliario y sillas', 'Equipo de bar', 'Vehículos']),
    );
    expect(categorias.every((c) => c.esPredefinida)).toBe(true);
  });

  it('crea un activo con IVA (tipoFiscal=A) repartiendo base + IVA soportado', async () => {
    const categoria = (await categoriasController.listar()).find((c) => c.nombre === 'Iluminación y sonido')!;

    const activo = await activosController.crear({
      categoriaId: categoria.id,
      nombre: `Focos LED ${randomUUID()}`,
      fechaCompra: new Date().toISOString(),
      cuentaPagoId,
      tipoFiscal: TipoFiscal.A,
      baseImponible: 800,
      ivaPercent: 21,
      vidaUtilAnios: 5,
      valorResidual: 0,
    });

    expect(activo.coste).toBe('968');
    expect(activo.baseImponible).toBe('800');
    expect(activo.importeIva).toBe('168');
    expect(activo.valorNetoContable).toBe('968');
  });

  it('pone al día la amortización automáticamente al consultar, y bloquea eliminar tras ello', async () => {
    const categoria = (await categoriasController.listar()).find((c) => c.nombre === 'Vehículos')!;

    const creado = await activosController.crear({
      categoriaId: categoria.id,
      nombre: `Furgoneta ${randomUUID()}`,
      fechaCompra: haceMeses(3).toISOString(),
      cuentaPagoId,
      tipoFiscal: TipoFiscal.B,
      importe: 12000,
      vidaUtilAnios: 10, // 12000/120 meses = 100€/mes
      valorResidual: 0,
    });
    expect(creado.amortizacionAcumulada).toBe('0');

    const obtenido = await activosController.obtener(creado.id);
    expect(obtenido.amortizacionAcumulada).toBe('300'); // 100€ x 3 meses
    expect(obtenido.valorNetoContable).toBe('11700');

    await expect(activosController.eliminar(creado.id)).rejects.toThrow(ConflictException);

    const dadaDeBaja = await activosController.darDeBaja(creado.id);
    expect(dadaDeBaja.activo).toBe(false);
  });

  it('elimina un activo sin amortización', async () => {
    const categoria = (await categoriasController.listar()).find((c) => c.nombre === 'Equipo de bar')!;

    const creado = await activosController.crear({
      categoriaId: categoria.id,
      nombre: `Palomitera ${randomUUID()}`,
      fechaCompra: new Date().toISOString(),
      cuentaPagoId,
      tipoFiscal: TipoFiscal.B,
      importe: 300,
      vidaUtilAnios: 5,
      valorResidual: 0,
    });

    await activosController.eliminar(creado.id);
    await expect(activosController.obtener(creado.id)).rejects.toThrow();
  });
});
