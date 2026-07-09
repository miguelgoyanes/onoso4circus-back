import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';
import { ConflictException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmTestModule } from '../test/typeorm-test.module';
import { TesoreriaModule } from './tesoreria.module';
import { TesoreriaController } from './api/tesoreria.controller';
import { TipoMovimientoCapital } from './domain/tipo-movimiento-capital';
import { AccountingService } from '../accounting/application/accounting.service';
import { AccountType, TipoCuentaDinero } from '../accounting/domain/account';
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
    await moduleRef.init();

    controller = moduleRef.get(TesoreriaController);
    accountingService = moduleRef.get(AccountingService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('siembra la cuenta de Capital al arrancar', async () => {
    const capital = await accountingService.obtenerCuentaPorCodigo('100');
    expect(capital.type).toBe(AccountType.EQUITY);
  });

  it('crea una cuenta CAJA y otra BANCO con código autoincremental por tipo', async () => {
    const caja1 = await controller.crearCuenta({
      nombre: `Caja test ${randomUUID()}`,
      tipo: TipoCuentaDinero.CAJA,
      usableEnTaquilla: true,
      usableEnBar: false,
    });
    const caja2 = await controller.crearCuenta({
      nombre: `Caja test ${randomUUID()}`,
      tipo: TipoCuentaDinero.CAJA,
      usableEnTaquilla: false,
      usableEnBar: true,
    });
    const banco1 = await controller.crearCuenta({
      nombre: `Banco test ${randomUUID()}`,
      tipo: TipoCuentaDinero.BANCO,
      usableEnTaquilla: false,
      usableEnBar: false,
    });

    expect(caja1.tipo).toBe(TipoCuentaDinero.CAJA);
    expect(caja1.saldo).toBe('0');
    expect(caja1.usableEnTaquilla).toBe(true);
    expect(banco1.tipo).toBe(TipoCuentaDinero.BANCO);

    const cuentaCaja1 = await accountingService.obtenerCuentaPorId(caja1.id);
    const cuentaCaja2 = await accountingService.obtenerCuentaPorId(caja2.id);
    const cuentaBanco1 = await accountingService.obtenerCuentaPorId(banco1.id);
    expect(cuentaCaja1.code.startsWith('570')).toBe(true);
    expect(cuentaCaja2.code.startsWith('570')).toBe(true);
    expect(cuentaCaja1.code).not.toBe(cuentaCaja2.code);
    expect(cuentaBanco1.code.startsWith('572')).toBe(true);
  });

  it('transferir mueve dinero de una cuenta a otra sin tocar el patrimonio total', async () => {
    const origen = await controller.crearCuenta({
      nombre: `Caja origen ${randomUUID()}`,
      tipo: TipoCuentaDinero.CAJA,
      usableEnTaquilla: false,
      usableEnBar: false,
    });
    const destino = await controller.crearCuenta({
      nombre: `Banco destino ${randomUUID()}`,
      tipo: TipoCuentaDinero.BANCO,
      usableEnTaquilla: false,
      usableEnBar: false,
    });

    const capital = await accountingService.obtenerCuentaPorCodigo('100');
    await accountingService.post(
      new JournalEntry({
        id: randomUUID(),
        date: new Date(),
        description: 'Saldo inicial de prueba',
        lines: [
          new JournalLine({ account: await accountingService.obtenerCuentaPorId(origen.id), debit: new Decimal(100) }),
          new JournalLine({ account: capital, credit: new Decimal(100) }),
        ],
      }),
    );

    await controller.transferir({ origenId: origen.id, destinoId: destino.id, importe: 40, concepto: 'test' });

    const origenActualizado = await controller.obtenerCuenta(origen.id);
    const destinoActualizado = await controller.obtenerCuenta(destino.id);
    expect(origenActualizado.saldo).toBe('60');
    expect(destinoActualizado.saldo).toBe('40');

    const movimientos = await controller.movimientos(destino.id);
    expect(movimientos[0].descripcion).toContain('Transferencia');
    expect(movimientos[0].importe).toBe('40');
  });

  it('registra entrada y salida de capital sin exponer la cuenta 100', async () => {
    const cuenta = await controller.crearCuenta({
      nombre: `Caja capital ${randomUUID()}`,
      tipo: TipoCuentaDinero.CAJA,
      usableEnTaquilla: false,
      usableEnBar: false,
    });

    await controller.registrarMovimientoCapital({
      cuentaId: cuenta.id,
      tipo: TipoMovimientoCapital.ENTRADA,
      importe: 200,
    });
    expect((await controller.obtenerCuenta(cuenta.id)).saldo).toBe('200');

    await controller.registrarMovimientoCapital({
      cuentaId: cuenta.id,
      tipo: TipoMovimientoCapital.SALIDA,
      importe: 50,
      concepto: 'Uso personal',
    });
    const actualizada = await controller.obtenerCuenta(cuenta.id);
    expect(actualizada.saldo).toBe('150');

    const movimientos = await controller.movimientos(cuenta.id);
    expect(movimientos.some((m) => m.descripcion.toLowerCase().includes('capital'))).toBe(true);
    expect(JSON.stringify(actualizada)).not.toContain('"100"');
  });

  it('no se puede eliminar una cuenta con movimientos; desactivarla siempre funciona', async () => {
    const cuenta = await controller.crearCuenta({
      nombre: `Caja usada ${randomUUID()}`,
      tipo: TipoCuentaDinero.CAJA,
      usableEnTaquilla: false,
      usableEnBar: false,
    });
    await controller.registrarMovimientoCapital({
      cuentaId: cuenta.id,
      tipo: TipoMovimientoCapital.ENTRADA,
      importe: 10,
    });

    await expect(controller.eliminarCuenta(cuenta.id)).rejects.toThrow(ConflictException);

    const desactivada = await controller.desactivarCuenta(cuenta.id);
    expect(desactivada.activa).toBe(false);

    const reactivada = await controller.activarCuenta(cuenta.id);
    expect(reactivada.activa).toBe(true);
  });

  it('elimina una cuenta sin movimientos', async () => {
    const cuenta = await controller.crearCuenta({
      nombre: `Caja sin usar ${randomUUID()}`,
      tipo: TipoCuentaDinero.CAJA,
      usableEnTaquilla: false,
      usableEnBar: false,
    });

    await controller.eliminarCuenta(cuenta.id);

    const cuentas = await controller.listarCuentas();
    expect(cuentas.find((c) => c.id === cuenta.id)).toBeUndefined();
  });
});
