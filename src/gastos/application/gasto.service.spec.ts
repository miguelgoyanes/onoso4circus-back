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
import {
  CategoriaGastoGeneral,
  CategoriaGastoPlaza,
  ConceptoGastoDerivado,
  EstadoPagoGasto,
  TipoGasto,
} from '../domain/gasto';
import { InMemoryGastoRepository } from '../infrastructure/in-memory-gasto.repository';
import { GastoService } from './gasto.service';

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
}

describe('GastoService', () => {
  let plazaRepo: InMemoryPlazaRepository;
  let fechaRepo: InMemoryFechaRepository;
  let plazaService: PlazaService;
  let fechaService: FechaService;
  let paseService: PaseService;
  let accountingService: AccountingService;
  let service: GastoService;

  beforeEach(() => {
    plazaRepo = new InMemoryPlazaRepository();
    fechaRepo = new InMemoryFechaRepository();
    plazaService = new PlazaService(plazaRepo);
    fechaService = new FechaService(fechaRepo, plazaRepo);
    paseService = new PaseService(new InMemoryPaseRepository(), fechaRepo);
    accountingService = new AccountingService(
      new InMemoryJournalEntryRepository(),
      new InMemoryAccountRepository(),
    );
    service = new GastoService(
      new InMemoryGastoRepository(),
      plazaService,
      fechaService,
      paseService,
      accountingService,
    );
  });

  async function crearCuentasBase() {
    await accountingService.crearCuenta({
      nombre: 'Gasto de personal ligado a plaza',
      code: '640001',
      type: AccountType.EXPENSE,
      esCuentaDeDinero: false,
    });
    await accountingService.crearCuenta({
      nombre: 'Gasto de personal — estructura',
      code: '641001',
      type: AccountType.EXPENSE,
      esCuentaDeDinero: false,
    });
    await accountingService.crearCuenta({
      nombre: 'Seguridad Social a cargo de la empresa',
      code: '642001',
      type: AccountType.EXPENSE,
      esCuentaDeDinero: false,
    });
    await accountingService.crearCuenta({
      nombre: 'Gastos derivados de personal',
      code: '643001',
      type: AccountType.EXPENSE,
      esCuentaDeDinero: false,
    });
    await accountingService.crearCuenta({
      nombre: 'Gasto de montaje/plaza',
      code: '620001',
      type: AccountType.EXPENSE,
      esCuentaDeDinero: false,
    });
    await accountingService.crearCuenta({
      nombre: 'Gastos generales / estructura',
      code: '629001',
      type: AccountType.EXPENSE,
      esCuentaDeDinero: false,
    });
    await accountingService.crearCuenta({
      nombre: 'Proveedores / Pendiente de pago',
      code: '400001',
      type: AccountType.LIABILITY,
      esCuentaDeDinero: false,
    });
    await accountingService.crearCuenta({
      nombre: 'Tesorería general',
      code: '570001',
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });
  }

  it('registra un gasto PERSONAL con plaza contra 640001', async () => {
    await crearCuentasBase();
    const plaza = await plazaService.crear('Feria de Julio', 'Madrid');
    const cuentaPago = await accountingService.obtenerCuentaPorCodigo('570001');

    const gasto = await service.crear({
      tipo: TipoGasto.PERSONAL,
      fecha: new Date('2026-07-10'),
      descripcion: 'Pago al cómico',
      estadoPago: EstadoPagoGasto.PAGADO,
      cuentaPagoId: cuentaPago.id,
      plazaId: plaza.id,
      empleadoId: 'emp-1',
      importeSalario: 200,
    });

    expect(gasto.importeTotal.equals(new Decimal(200))).toBe(true);
    const cuenta640001 = await accountingService.obtenerCuentaPorCodigo('640001');
    expect((await accountingService.saldoPorCuenta(cuenta640001.id)).equals(new Decimal(200))).toBe(
      true,
    );
    expect((await accountingService.saldoPorCuenta(cuentaPago.id)).equals(new Decimal(-200))).toBe(
      true,
    );
  });

  it('registra un gasto PERSONAL sin plaza (ej. cuota de autónomo) contra 641001', async () => {
    await crearCuentasBase();
    const cuentaPago = await accountingService.obtenerCuentaPorCodigo('570001');

    await service.crear({
      tipo: TipoGasto.PERSONAL,
      fecha: new Date('2026-07-10'),
      descripcion: 'Cuota de autónomo de Brandon',
      estadoPago: EstadoPagoGasto.PAGADO,
      cuentaPagoId: cuentaPago.id,
      empleadoId: 'brandon',
      importeSalario: 300,
    });

    const cuenta641001 = await accountingService.obtenerCuentaPorCodigo('641001');
    expect((await accountingService.saldoPorCuenta(cuenta641001.id)).equals(new Decimal(300))).toBe(
      true,
    );
  });

  it('registra coste_ss (642001) y gastos_derivados (643001, con categoryTag) sumando al total', async () => {
    await crearCuentasBase();
    const plaza = await plazaService.crear('Feria de Julio', 'Madrid');
    const cuentaPago = await accountingService.obtenerCuentaPorCodigo('570001');

    const gasto = await service.crear({
      tipo: TipoGasto.PERSONAL,
      fecha: new Date('2026-07-10'),
      descripcion: 'Pago con SS y dietas',
      estadoPago: EstadoPagoGasto.PAGADO,
      cuentaPagoId: cuentaPago.id,
      plazaId: plaza.id,
      empleadoId: 'emp-1',
      importeSalario: 100,
      costeSs: 30,
      gastosDerivados: [{ concepto: ConceptoGastoDerivado.DIETA, importe: 20 }],
    });

    expect(gasto.importeTotal.equals(new Decimal(150))).toBe(true);

    const cuenta642001 = await accountingService.obtenerCuentaPorCodigo('642001');
    expect((await accountingService.saldoPorCuenta(cuenta642001.id)).equals(new Decimal(30))).toBe(
      true,
    );
    const cuenta643001 = await accountingService.obtenerCuentaPorCodigo('643001');
    expect((await accountingService.saldoPorCuenta(cuenta643001.id)).equals(new Decimal(20))).toBe(
      true,
    );

    const lineas = await accountingService.entriesByDimension({ accountId: cuenta643001.id });
    expect(lineas[0]?.dimensions.categoryTag).toBe(ConceptoGastoDerivado.DIETA);
  });

  it('registra un gasto PLAZA contra 620001 con categoryTag de la categoría', async () => {
    await crearCuentasBase();
    const plaza = await plazaService.crear('Feria de Julio', 'Madrid');
    const cuentaPago = await accountingService.obtenerCuentaPorCodigo('570001');

    await service.crear({
      tipo: TipoGasto.PLAZA,
      fecha: new Date('2026-07-10'),
      descripcion: 'Montaje de carpa',
      estadoPago: EstadoPagoGasto.PAGADO,
      cuentaPagoId: cuentaPago.id,
      plazaId: plaza.id,
      categoriaPlaza: CategoriaGastoPlaza.MONTAJE,
      importe: 300,
    });

    const cuenta620001 = await accountingService.obtenerCuentaPorCodigo('620001');
    expect((await accountingService.saldoPorCuenta(cuenta620001.id)).equals(new Decimal(300))).toBe(
      true,
    );
  });

  it('registra un gasto GENERAL contra 629001', async () => {
    await crearCuentasBase();
    const cuentaPago = await accountingService.obtenerCuentaPorCodigo('570001');

    await service.crear({
      tipo: TipoGasto.GENERAL,
      fecha: new Date('2026-07-10'),
      descripcion: 'Gestoría',
      estadoPago: EstadoPagoGasto.PAGADO,
      cuentaPagoId: cuentaPago.id,
      categoriaGeneral: CategoriaGastoGeneral.GESTORIA,
      importe: 80,
    });

    const cuenta629001 = await accountingService.obtenerCuentaPorCodigo('629001');
    expect((await accountingService.saldoPorCuenta(cuenta629001.id)).equals(new Decimal(80))).toBe(
      true,
    );
  });

  it('un gasto PENDIENTE_PAGO no requiere cuentaPagoId y credita Proveedores (400001)', async () => {
    await crearCuentasBase();

    const gasto = await service.crear({
      tipo: TipoGasto.GENERAL,
      fecha: new Date('2026-07-10'),
      descripcion: 'Factura de marketing a 30 días',
      estadoPago: EstadoPagoGasto.PENDIENTE_PAGO,
      categoriaGeneral: CategoriaGastoGeneral.MARKETING,
      importe: 120,
    });

    expect(gasto.estadoPago).toBe(EstadoPagoGasto.PENDIENTE_PAGO);
    const cuenta400001 = await accountingService.obtenerCuentaPorCodigo('400001');
    expect((await accountingService.saldoPorCuenta(cuenta400001.id)).equals(new Decimal(120))).toBe(
      true,
    );
  });

  it('pagarPendiente liquida contra Proveedores y marca el gasto como PAGADO', async () => {
    await crearCuentasBase();
    const cuentaPago = await accountingService.obtenerCuentaPorCodigo('570001');

    const gasto = await service.crear({
      tipo: TipoGasto.GENERAL,
      fecha: new Date('2026-07-10'),
      descripcion: 'Factura de marketing a 30 días',
      estadoPago: EstadoPagoGasto.PENDIENTE_PAGO,
      categoriaGeneral: CategoriaGastoGeneral.MARKETING,
      importe: 120,
    });

    const pagado = await service.pagarPendiente(gasto.id, cuentaPago.id);
    expect(pagado.estadoPago).toBe(EstadoPagoGasto.PAGADO);

    const cuenta400001 = await accountingService.obtenerCuentaPorCodigo('400001');
    expect((await accountingService.saldoPorCuenta(cuenta400001.id)).equals(new Decimal(0))).toBe(
      true,
    );
    expect((await accountingService.saldoPorCuenta(cuentaPago.id)).equals(new Decimal(-120))).toBe(
      true,
    );

    await expect(service.pagarPendiente(gasto.id, cuentaPago.id)).rejects.toThrow(
      /ya está pagado/i,
    );
  });

  it('rechaza un gasto PAGADO sin cuentaPagoId', async () => {
    await crearCuentasBase();
    await expect(
      service.crear({
        tipo: TipoGasto.GENERAL,
        fecha: new Date('2026-07-10'),
        descripcion: 'x',
        estadoPago: EstadoPagoGasto.PAGADO,
        categoriaGeneral: CategoriaGastoGeneral.OTRO,
        importe: 10,
      }),
    ).rejects.toThrow(/cuentaPagoId es obligatorio/i);
  });

  it('rechaza un gasto PERSONAL sin empleadoId', async () => {
    await crearCuentasBase();
    const cuentaPago = await accountingService.obtenerCuentaPorCodigo('570001');
    await expect(
      service.crear({
        tipo: TipoGasto.PERSONAL,
        fecha: new Date('2026-07-10'),
        descripcion: 'x',
        estadoPago: EstadoPagoGasto.PAGADO,
        cuentaPagoId: cuentaPago.id,
        importeSalario: 100,
      }),
    ).rejects.toThrow(/empleadoId es obligatorio/i);
  });

  it('rechaza crear un gasto si la plaza indicada no existe', async () => {
    await crearCuentasBase();
    const cuentaPago = await accountingService.obtenerCuentaPorCodigo('570001');
    await expect(
      service.crear({
        tipo: TipoGasto.PLAZA,
        fecha: new Date('2026-07-10'),
        descripcion: 'x',
        estadoPago: EstadoPagoGasto.PAGADO,
        cuentaPagoId: cuentaPago.id,
        plazaId: 'no-existe',
        categoriaPlaza: CategoriaGastoPlaza.OTRO,
        importe: 10,
      }),
    ).rejects.toThrow(/no encontrada/i);
  });

  it('lista gastos filtrando por plazaId, tipo y estadoPago', async () => {
    await crearCuentasBase();
    const plaza = await plazaService.crear('Feria de Julio', 'Madrid');
    const cuentaPago = await accountingService.obtenerCuentaPorCodigo('570001');

    await service.crear({
      tipo: TipoGasto.PLAZA,
      fecha: new Date('2026-07-10'),
      descripcion: 'Montaje',
      estadoPago: EstadoPagoGasto.PAGADO,
      cuentaPagoId: cuentaPago.id,
      plazaId: plaza.id,
      categoriaPlaza: CategoriaGastoPlaza.MONTAJE,
      importe: 50,
    });
    await service.crear({
      tipo: TipoGasto.GENERAL,
      fecha: new Date('2026-07-10'),
      descripcion: 'Gestoría',
      estadoPago: EstadoPagoGasto.PENDIENTE_PAGO,
      categoriaGeneral: CategoriaGastoGeneral.GESTORIA,
      importe: 40,
    });

    expect(await service.listar({ plazaId: plaza.id })).toHaveLength(1);
    expect(await service.listar({ tipo: TipoGasto.GENERAL })).toHaveLength(1);
    expect(await service.listar({ estadoPago: EstadoPagoGasto.PENDIENTE_PAGO })).toHaveLength(1);
    expect(await service.listar()).toHaveLength(2);
  });
});
