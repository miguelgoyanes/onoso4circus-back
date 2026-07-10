import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmTestModule } from '../test/typeorm-test.module';
import { ContabilidadModule } from './contabilidad.module';
import { ContabilidadService } from './application/contabilidad.service';
import { AccountingService } from '../accounting/application/accounting.service';
import { AccountType } from '../accounting/domain/account';
import { JournalEntry } from '../accounting/domain/journal-entry';
import { JournalLine } from '../accounting/domain/journal-line';

describe('Contabilidad (integración contra Postgres real)', () => {
  let contabilidadService: ContabilidadService;
  let accountingService: AccountingService;
  let moduleRef: import('@nestjs/testing').TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmTestModule, ContabilidadModule],
    }).compile();
    await moduleRef.init();

    contabilidadService = moduleRef.get(ContabilidadService);
    accountingService = moduleRef.get(AccountingService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('libroDiario, libroMayor, pyg y balance son coherentes entre sí para un mismo conjunto de asientos', async () => {
    const testId = randomUUID().replace(/-/g, '').slice(0, 3);
    const banco = await accountingService.crearCuenta({
      nombre: `Banco test ${testId}`,
      code: `572${testId}`,
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });
    const ingresos = await accountingService.crearCuenta({
      nombre: `Ingresos test ${testId}`,
      code: `709${testId}`,
      type: AccountType.INCOME,
      esCuentaDeDinero: false,
    });
    const gastos = await accountingService.crearCuenta({
      nombre: `Gastos test ${testId}`,
      code: `629${testId}`,
      type: AccountType.EXPENSE,
      esCuentaDeDinero: false,
    });

    await accountingService.post(
      new JournalEntry({
        id: randomUUID(),
        date: new Date('2026-06-05T00:00:00.000Z'),
        description: `Venta test ${testId}`,
        lines: [
          new JournalLine({ account: banco, debit: new Decimal(500) }),
          new JournalLine({ account: ingresos, credit: new Decimal(500) }),
        ],
      }),
    );
    await accountingService.post(
      new JournalEntry({
        id: randomUUID(),
        date: new Date('2026-06-10T00:00:00.000Z'),
        description: `Gasto test ${testId}`,
        lines: [
          new JournalLine({ account: gastos, debit: new Decimal(150) }),
          new JournalLine({ account: banco, credit: new Decimal(150) }),
        ],
      }),
    );

    const desde = new Date('2026-06-01T00:00:00.000Z');
    const hasta = new Date('2026-06-30T23:59:59.999Z');

    const diario = await contabilidadService.libroDiario({ accountIds: [banco.id], fechaDesde: desde, fechaHasta: hasta });
    expect(diario).toHaveLength(2);
    expect(diario.every((a) => a.lineas.length === 2)).toBe(true);

    const mayor = await contabilidadService.libroMayor(banco.id, desde, hasta);
    expect(mayor.saldoInicial.equals(0)).toBe(true);
    expect(mayor.saldoFinal.equals(350)).toBe(true);

    const pyg = await contabilidadService.pyg(desde, hasta);
    const lineaIngresos = pyg.ingresos.find((l) => l.cuenta.id === ingresos.id)!;
    const lineaGastos = pyg.gastos.find((l) => l.cuenta.id === gastos.id)!;
    expect(lineaIngresos.importe.equals(500)).toBe(true);
    expect(lineaGastos.importe.equals(150)).toBe(true);
    // pyg.resultado agrega TODAS las cuentas INCOME/EXPENSE del rango (no solo las de este
    // test) y la DB de test acumula filas de ejecuciones anteriores — se comprueba la
    // relación matemática, no un valor absoluto (ver memoria project_test_db_growth_flakiness).
    expect(pyg.resultado.equals(pyg.totalIngresos.minus(pyg.totalGastos))).toBe(true);

    const balance = await contabilidadService.balance(hasta);
    expect(balance.totalActivo.equals(balance.totalPasivo.plus(balance.totalPatrimonioNeto))).toBe(true);
    const lineaBanco = balance.activo.find((l) => l.cuenta.id === banco.id)!;
    expect(lineaBanco.saldo.equals(350)).toBe(true);
  });

  it('listarCuentas devuelve el plan de cuentas ordenado por código', async () => {
    const cuentas = await contabilidadService.listarCuentas();
    expect(cuentas.length).toBeGreaterThan(0);
    const codigos = cuentas.map((c) => c.code);
    expect([...codigos].sort()).toEqual(codigos);
  });
});
