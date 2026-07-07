import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';
import { ConflictException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmTestModule } from '../test/typeorm-test.module';
import { TesoreriaModule } from './tesoreria.module';
import { TesoreriaController } from './api/tesoreria.controller';
import { AccountingService } from '../accounting/application/accounting.service';
import { AccountType } from '../accounting/domain/account';
import { JournalEntry } from '../accounting/domain/journal-entry';
import { JournalLine } from '../accounting/domain/journal-line';

describe('Tesorería (integración contra Postgres real)', () => {
  let controller: TesoreriaController;
  let accountingService: AccountingService;
  let moduleRef: import('@nestjs/testing').TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmTestModule, TesoreriaModule],
    }).compile();

    controller = moduleRef.get(TesoreriaController);
    accountingService = moduleRef.get(AccountingService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('crea una cuenta de dinero desde el endpoint y aparece en el listado con saldo 0', async () => {
    const testId = randomUUID();
    const creada = await controller.crearCuenta({
      nombre: `Caja — Taquilla ${testId}`,
      code: testId,
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });

    const cuentas = await controller.listarCuentas();
    const encontrada = cuentas.find((c) => c.id === creada.id);

    expect(encontrada).toBeDefined();
    expect(encontrada?.saldo).toBe('0');
  });

  it('rechaza crear una cuenta con un código duplicado', async () => {
    const code = randomUUID();
    await controller.crearCuenta({
      nombre: 'Cuenta original',
      code,
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });

    await expect(
      controller.crearCuenta({
        nombre: 'Cuenta duplicada',
        code,
        type: AccountType.ASSET,
        esCuentaDeDinero: false,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('el saldo de una cuenta de dinero refleja los asientos posteados', async () => {
    const testId = randomUUID();
    const caja = await accountingService.crearCuenta({
      nombre: `Caja — Bar ${testId}`,
      code: `caja-${testId}`,
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });
    const ingresos = await accountingService.crearCuenta({
      nombre: `Ingresos bar ${testId}`,
      code: `ingresos-${testId}`,
      type: AccountType.INCOME,
      esCuentaDeDinero: false,
    });

    await accountingService.post(
      new JournalEntry({
        id: randomUUID(),
        date: new Date('2026-07-06'),
        description: 'Venta de bar (test integración)',
        lines: [
          new JournalLine({ account: caja, debit: new Decimal(35) }),
          new JournalLine({ account: ingresos, credit: new Decimal(35) }),
        ],
      }),
    );

    const cuentas = await controller.listarCuentas();
    const encontradaCaja = cuentas.find((c) => c.id === caja.id);
    const encontradaIngresos = cuentas.find((c) => c.id === ingresos.id);

    expect(encontradaCaja?.saldo).toBe('35');
    expect(encontradaIngresos).toBeDefined();
    expect(encontradaIngresos?.esCuentaDeDinero).toBe(false);
    expect(encontradaIngresos?.saldo).toBe('35');
  });
});
