import { randomUUID } from 'crypto';
import { NotFoundException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmTestModule } from '../test/typeorm-test.module';
import { GastosModule } from './gastos.module';
import { GastosController } from './api/gastos.controller';
import {
  CategoriaGastoGeneral,
  CategoriaGastoPlaza,
  ConceptoGastoDerivado,
  EstadoPagoGasto,
  TipoGasto,
} from './domain/gasto';
import { PlazaService } from '../plazas/application/plaza.service';
import { AccountingService } from '../accounting/application/accounting.service';
import { Account, AccountType } from '../accounting/domain/account';

describe('Gastos (integración contra Postgres real)', () => {
  let gastosController: GastosController;
  let plazaService: PlazaService;
  let accountingService: AccountingService;
  let moduleRef: import('@nestjs/testing').TestingModule;

  // Las cuentas se resuelven por código fijo (620001, 629001, 640001, 641001, 642001,
  // 643001, 400001) — en la _test DB (persistente entre ejecuciones, igual que en
  // accounting.integration.spec.ts / tesoreria.integration.spec.ts) hay que asegurarlas
  // de forma idempotente en vez de crearlas siempre desde cero.
  async function asegurarCuenta(
    code: string,
    nombre: string,
    type: AccountType,
    esCuentaDeDinero: boolean,
  ): Promise<Account> {
    try {
      return await accountingService.obtenerCuentaPorCodigo(code);
    } catch (error) {
      if (!(error instanceof NotFoundException)) throw error;
      return accountingService.crearCuenta({ nombre, code, type, esCuentaDeDinero });
    }
  }

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmTestModule, GastosModule],
    }).compile();

    gastosController = moduleRef.get(GastosController);
    plazaService = moduleRef.get(PlazaService);
    accountingService = moduleRef.get(AccountingService);

    await asegurarCuenta('620001', 'Gasto de montaje/plaza', AccountType.EXPENSE, false);
    await asegurarCuenta('629001', 'Gastos generales / estructura', AccountType.EXPENSE, false);
    await asegurarCuenta('640001', 'Gasto de personal ligado a plaza', AccountType.EXPENSE, false);
    await asegurarCuenta('641001', 'Gasto de personal — estructura', AccountType.EXPENSE, false);
    await asegurarCuenta('642001', 'Seguridad Social a cargo de la empresa', AccountType.EXPENSE, false);
    await asegurarCuenta('643001', 'Gastos derivados de personal', AccountType.EXPENSE, false);
    await asegurarCuenta('400001', 'Proveedores / Pendiente de pago', AccountType.LIABILITY, false);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('registra un gasto de tipo PLAZA y refleja el saldo en la cuenta de pago elegida', async () => {
    const testId = randomUUID();
    const cuentaPago = await accountingService.crearCuenta({
      nombre: `Banco ${testId}`,
      code: `572001-${testId.slice(0, 8)}`,
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });
    const plaza = await plazaService.crear(`Feria de Julio ${testId}`, 'Madrid');

    const gasto = await gastosController.crear({
      tipo: TipoGasto.PLAZA,
      fecha: '2026-07-10',
      descripcion: 'Montaje de carpa (test integración)',
      estadoPago: EstadoPagoGasto.PAGADO,
      cuentaPagoId: cuentaPago.id,
      plazaId: plaza.id,
      categoriaPlaza: CategoriaGastoPlaza.MONTAJE,
      importe: 300,
    });

    expect(gasto.plazaId).toBe(plaza.id);
    expect(gasto.importeTotal).toBe('300');

    const saldoPago = await accountingService.saldoPorCuenta(cuentaPago.id);
    expect(saldoPago.toString()).toBe('-300');

    const gastosDeLaPlaza = await gastosController.listar({ plazaId: plaza.id });
    expect(gastosDeLaPlaza.map((g) => g.id)).toContain(gasto.id);
  });

  it('registra un gasto PERSONAL sin plaza (cuota de autónomo) con gastos derivados', async () => {
    const testId = randomUUID();
    const cuentaPago = await accountingService.crearCuenta({
      nombre: `Banco ${testId}`,
      code: `572002-${testId.slice(0, 8)}`,
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });

    const gasto = await gastosController.crear({
      tipo: TipoGasto.PERSONAL,
      fecha: '2026-07-10',
      descripcion: 'Cuota de autónomo (test integración)',
      estadoPago: EstadoPagoGasto.PAGADO,
      cuentaPagoId: cuentaPago.id,
      empleadoId: 'brandon',
      importeSalario: 250,
      gastosDerivados: [{ concepto: ConceptoGastoDerivado.SEGURO, importe: 15 }],
    });

    expect(gasto.empleadoId).toBe('brandon');
    expect(gasto.importeTotal).toBe('265');

    const saldoPago = await accountingService.saldoPorCuenta(cuentaPago.id);
    expect(saldoPago.toString()).toBe('-265');
  });

  it('registra un gasto GENERAL como PENDIENTE_PAGO y luego lo liquida', async () => {
    const testId = randomUUID();
    const cuentaPago = await accountingService.crearCuenta({
      nombre: `Banco ${testId}`,
      code: `572003-${testId.slice(0, 8)}`,
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });

    const gasto = await gastosController.crear({
      tipo: TipoGasto.GENERAL,
      fecha: '2026-07-10',
      descripcion: 'Factura de gestoría (test integración)',
      estadoPago: EstadoPagoGasto.PENDIENTE_PAGO,
      categoriaGeneral: CategoriaGastoGeneral.GESTORIA,
      importe: 90,
    });

    expect(gasto.estadoPago).toBe(EstadoPagoGasto.PENDIENTE_PAGO);

    const pagado = await gastosController.pagar(gasto.id, { cuentaPagoId: cuentaPago.id });
    expect(pagado.estadoPago).toBe(EstadoPagoGasto.PAGADO);

    const saldoPago = await accountingService.saldoPorCuenta(cuentaPago.id);
    expect(saldoPago.toString()).toBe('-90');
  });

  it('rechaza registrar un gasto de tipo PLAZA para una plaza inexistente', async () => {
    const testId = randomUUID();
    const cuentaPago = await accountingService.crearCuenta({
      nombre: `Banco ${testId}`,
      code: `572004-${testId.slice(0, 8)}`,
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });

    await expect(
      gastosController.crear({
        tipo: TipoGasto.PLAZA,
        fecha: '2026-07-10',
        descripcion: 'x',
        estadoPago: EstadoPagoGasto.PAGADO,
        cuentaPagoId: cuentaPago.id,
        plazaId: '00000000-0000-0000-0000-000000000000',
        categoriaPlaza: CategoriaGastoPlaza.OTRO,
        importe: 10,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
