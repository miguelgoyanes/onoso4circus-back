import Decimal from 'decimal.js';
import { Plaza } from '../../plazas/domain/plaza';
import { Fecha } from '../../plazas/domain/fecha';
import { Pase } from '../../plazas/domain/pase';
import { PlazaRepository } from '../../plazas/application/plaza.repository';
import { FechaRepository } from '../../plazas/application/fecha.repository';
import { PaseRepository } from '../../plazas/application/pase.repository';
import { PlazaService } from '../../plazas/application/plaza.service';
import { FechaService } from '../../plazas/application/fecha.service';
import { PaseService } from '../../plazas/application/pase.service';
import { AccountingService } from '../../accounting/application/accounting.service';
import { InMemoryJournalEntryRepository } from '../../accounting/infrastructure/in-memory-journal-entry.repository';
import { InMemoryAccountRepository } from '../../accounting/infrastructure/in-memory-account.repository';
import { AccountType } from '../../accounting/domain/account';
import { EstadoCobro } from '../domain/estado-cobro';
import { TipoFiscal } from '../domain/tipo-fiscal';
import { InMemoryContratoIngresoRepository } from '../infrastructure/in-memory-contrato-ingreso.repository';
import { ContratoIngresoService } from './contrato-ingreso.service';

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

describe('ContratoIngresoService', () => {
  let accountingService: AccountingService;
  let service: ContratoIngresoService;

  beforeEach(async () => {
    const plazaRepo = new InMemoryPlazaRepository();
    const fechaRepo = new InMemoryFechaRepository();
    const plazaService = new PlazaService(plazaRepo);
    const fechaService = new FechaService(fechaRepo, plazaRepo);
    const paseService = new PaseService(new InMemoryPaseRepository(), fechaRepo);
    accountingService = new AccountingService(new InMemoryJournalEntryRepository(), new InMemoryAccountRepository());
    service = new ContratoIngresoService(
      new InMemoryContratoIngresoRepository(),
      plazaService,
      fechaService,
      paseService,
      accountingService,
    );

    await accountingService.crearCuenta({ nombre: 'Ingresos por contrato', code: '702001', type: AccountType.INCOME, esCuentaDeDinero: false });
    await accountingService.crearCuenta({ nombre: 'Clientes / Pendiente de cobro', code: '430001', type: AccountType.ASSET, esCuentaDeDinero: false });
    await accountingService.crearCuenta({ nombre: 'Hacienda Pública, IVA repercutido', code: '477001', type: AccountType.LIABILITY, esCuentaDeDinero: false });
    await accountingService.crearCuenta({ nombre: 'Tesorería general', code: '570001', type: AccountType.ASSET, esCuentaDeDinero: true });
  });

  it('crea un contrato COBRADO sin IVA: cuentaDestino débito / 702001 crédito', async () => {
    const cuentaDestino = await accountingService.obtenerCuentaPorCodigo('570001');
    const contrato = await service.crear({
      cliente: 'Ayuntamiento de Prueba',
      concepto: 'Actuación circo',
      fecha: new Date('2026-07-01'),
      estadoCobro: EstadoCobro.COBRADO,
      cuentaDestinoId: cuentaDestino.id,
      importe: 1000,
    });

    expect(contrato.importe.equals(new Decimal(1000))).toBe(true);
    expect(contrato.tipoFiscal).toBeUndefined();

    const cuentaIngresos = await accountingService.obtenerCuentaPorCodigo('702001');
    expect((await accountingService.saldoPorCuenta(cuentaIngresos.id)).equals(new Decimal(1000))).toBe(true);
    expect((await accountingService.saldoPorCuenta(cuentaDestino.id)).equals(new Decimal(1000))).toBe(true);
  });

  it('crea un contrato PENDIENTE_COBRO sin cuentaDestinoId: 430001 débito / 702001 crédito', async () => {
    const contrato = await service.crear({
      cliente: 'Ayuntamiento de Prueba',
      concepto: 'Actuación circo',
      fecha: new Date('2026-07-01'),
      estadoCobro: EstadoCobro.PENDIENTE_COBRO,
      importe: 500,
    });

    expect(contrato.cuentaDestinoId).toBeUndefined();
    const cuentaClientes = await accountingService.obtenerCuentaPorCodigo('430001');
    expect((await accountingService.saldoPorCuenta(cuentaClientes.id)).equals(new Decimal(500))).toBe(true);
  });

  it('rechaza crear COBRADO sin cuentaDestinoId', async () => {
    await expect(
      service.crear({
        cliente: 'X',
        concepto: 'Y',
        fecha: new Date('2026-07-01'),
        estadoCobro: EstadoCobro.COBRADO,
        importe: 100,
      }),
    ).rejects.toThrow(/cuentaDestinoId/);
  });

  it('tipoFiscal = A reparte base + IVA repercutido en 477001', async () => {
    const cuentaDestino = await accountingService.obtenerCuentaPorCodigo('570001');
    const contrato = await service.crear({
      cliente: 'Ayuntamiento de Prueba',
      concepto: 'Actuación circo',
      fecha: new Date('2026-07-01'),
      estadoCobro: EstadoCobro.COBRADO,
      cuentaDestinoId: cuentaDestino.id,
      tipoFiscal: TipoFiscal.A,
      baseImponible: 1000,
      ivaPercent: 21,
    });

    expect(contrato.importe.equals(new Decimal(1210))).toBe(true);
    expect(contrato.importeIva?.equals(new Decimal(210))).toBe(true);

    const cuentaIva = await accountingService.obtenerCuentaPorCodigo('477001');
    expect((await accountingService.saldoPorCuenta(cuentaIva.id)).equals(new Decimal(210))).toBe(true);
    expect((await accountingService.saldoPorCuenta(cuentaDestino.id)).equals(new Decimal(1210))).toBe(true);
  });

  it('cobrar() pasa un PENDIENTE_COBRO a COBRADO: cuentaDestino débito / 430001 crédito', async () => {
    const contrato = await service.crear({
      cliente: 'Ayuntamiento de Prueba',
      concepto: 'Actuación circo',
      fecha: new Date('2026-07-01'),
      estadoCobro: EstadoCobro.PENDIENTE_COBRO,
      importe: 500,
    });
    const cuentaDestino = await accountingService.obtenerCuentaPorCodigo('570001');

    const cobrado = await service.cobrar(contrato.id, cuentaDestino.id);

    expect(cobrado.estadoCobro).toBe(EstadoCobro.COBRADO);
    expect(cobrado.cuentaDestinoId).toBe(cuentaDestino.id);
    const cuentaClientes = await accountingService.obtenerCuentaPorCodigo('430001');
    expect((await accountingService.saldoPorCuenta(cuentaClientes.id)).equals(new Decimal(0))).toBe(true);
    expect((await accountingService.saldoPorCuenta(cuentaDestino.id)).equals(new Decimal(500))).toBe(true);
  });

  it('rechaza cobrar() un contrato ya cobrado', async () => {
    const cuentaDestino = await accountingService.obtenerCuentaPorCodigo('570001');
    const contrato = await service.crear({
      cliente: 'X',
      concepto: 'Y',
      fecha: new Date('2026-07-01'),
      estadoCobro: EstadoCobro.COBRADO,
      cuentaDestinoId: cuentaDestino.id,
      importe: 100,
    });

    await expect(service.cobrar(contrato.id, cuentaDestino.id)).rejects.toThrow(/ya está cobrado/);
  });

  describe('actualizar', () => {
    it('corrige importe de un contrato PENDIENTE_COBRO revirtiendo y reponiendo el asiento', async () => {
      const contrato = await service.crear({
        cliente: 'Ayuntamiento de Prueba',
        concepto: 'Actuación circo',
        fecha: new Date('2026-07-01'),
        estadoCobro: EstadoCobro.PENDIENTE_COBRO,
        importe: 500,
      });

      const corregido = await service.actualizar(contrato.id, {
        cliente: 'Ayuntamiento de Prueba',
        concepto: 'Actuación circo (corregido)',
        fecha: new Date('2026-07-02'),
        importe: 800,
      });

      expect(corregido.importe.equals(new Decimal(800))).toBe(true);
      expect(corregido.estadoCobro).toBe(EstadoCobro.PENDIENTE_COBRO);
      const cuentaClientes = await accountingService.obtenerCuentaPorCodigo('430001');
      expect((await accountingService.saldoPorCuenta(cuentaClientes.id)).equals(new Decimal(800))).toBe(true);
    });

    it('corrige importe de un contrato COBRADO manteniendo la misma cuentaDestino', async () => {
      const cuentaDestino = await accountingService.obtenerCuentaPorCodigo('570001');
      const contrato = await service.crear({
        cliente: 'X',
        concepto: 'Y',
        fecha: new Date('2026-07-01'),
        estadoCobro: EstadoCobro.COBRADO,
        cuentaDestinoId: cuentaDestino.id,
        importe: 1000,
      });

      const corregido = await service.actualizar(contrato.id, {
        cliente: 'X',
        concepto: 'Y',
        fecha: new Date('2026-07-01'),
        importe: 900,
      });

      expect(corregido.importe.equals(new Decimal(900))).toBe(true);
      expect(corregido.estadoCobro).toBe(EstadoCobro.COBRADO);
      expect((await accountingService.saldoPorCuenta(cuentaDestino.id)).equals(new Decimal(900))).toBe(true);
    });
  });

  it('eliminar revierte todos los asientos (creación + cobro)', async () => {
    const contrato = await service.crear({
      cliente: 'Ayuntamiento de Prueba',
      concepto: 'Actuación circo',
      fecha: new Date('2026-07-01'),
      estadoCobro: EstadoCobro.PENDIENTE_COBRO,
      importe: 500,
    });
    const cuentaDestino = await accountingService.obtenerCuentaPorCodigo('570001');
    await service.cobrar(contrato.id, cuentaDestino.id);

    await service.eliminar(contrato.id);

    await expect(service.obtener(contrato.id)).rejects.toThrow(/no encontrado/i);
    const cuentaClientes = await accountingService.obtenerCuentaPorCodigo('430001');
    expect((await accountingService.saldoPorCuenta(cuentaClientes.id)).equals(new Decimal(0))).toBe(true);
    expect((await accountingService.saldoPorCuenta(cuentaDestino.id)).equals(new Decimal(0))).toBe(true);
  });
});
