import { randomUUID } from 'crypto';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmTestModule } from '../test/typeorm-test.module';
import { VentasModule } from './ventas.module';
import { ContratosIngresoController } from './api/contratos-ingreso.controller';
import { EstadoCobro } from './domain/estado-cobro';
import { TipoFiscal } from './domain/tipo-fiscal';
import { AccountingService } from '../accounting/application/accounting.service';
import { AccountType } from '../accounting/domain/account';

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
