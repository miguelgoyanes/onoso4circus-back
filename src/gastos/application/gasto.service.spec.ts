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
import { Empleado } from '../../personal/domain/empleado';
import { RegimenEmpleado } from '../../personal/domain/regimen-empleado';
import { EmpleadoRepository } from '../../personal/application/empleado.repository';
import { EmpleadoService } from '../../personal/application/empleado.service';
import { AccountingService } from '../../accounting/application/accounting.service';
import { InMemoryJournalEntryRepository } from '../../accounting/infrastructure/in-memory-journal-entry.repository';
import { InMemoryAccountRepository } from '../../accounting/infrastructure/in-memory-account.repository';
import { AccountType } from '../../accounting/domain/account';
import { EstadoPagoGasto } from '../domain/gasto';
import { ConceptoPersonal } from '../domain/concepto-personal';
import { TipoFiscal } from '../domain/tipo-fiscal';
import { InMemoryGastoRepository } from '../infrastructure/in-memory-gasto.repository';
import { InMemoryCategoriaGastoRepository } from '../infrastructure/in-memory-categoria-gasto.repository';
import { CategoriaGastoService } from './categoria-gasto.service';
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

class InMemoryEmpleadoRepository implements EmpleadoRepository {
  private readonly empleados = new Map<string, Empleado>();
  async save(empleado: Empleado): Promise<void> {
    this.empleados.set(empleado.id, empleado);
  }
  async findById(id: string): Promise<Empleado | null> {
    return this.empleados.get(id) ?? null;
  }
  async findAll(): Promise<Empleado[]> {
    return [...this.empleados.values()];
  }
}

describe('GastoService', () => {
  let plazaRepo: InMemoryPlazaRepository;
  let plazaService: PlazaService;
  let empleadoRepo: InMemoryEmpleadoRepository;
  let empleadoService: EmpleadoService;
  let accountingService: AccountingService;
  let categoriaGastoService: CategoriaGastoService;
  let service: GastoService;

  beforeEach(() => {
    plazaRepo = new InMemoryPlazaRepository();
    const fechaRepo = new InMemoryFechaRepository();
    plazaService = new PlazaService(plazaRepo);
    const fechaService = new FechaService(fechaRepo, plazaRepo);
    const paseService = new PaseService(new InMemoryPaseRepository(), fechaRepo);
    empleadoRepo = new InMemoryEmpleadoRepository();
    empleadoService = new EmpleadoService(empleadoRepo);
    accountingService = new AccountingService(new InMemoryJournalEntryRepository(), new InMemoryAccountRepository());
    const gastoRepo = new InMemoryGastoRepository();
    categoriaGastoService = new CategoriaGastoService(
      new InMemoryCategoriaGastoRepository(),
      gastoRepo,
      accountingService,
    );
    service = new GastoService(
      gastoRepo,
      categoriaGastoService,
      plazaService,
      fechaService,
      paseService,
      empleadoService,
      accountingService,
    );
  });

  async function crearCuentasBase() {
    const cuentas: [string, string, AccountType][] = [
      ['640001', 'Gasto de personal ligado a plaza', AccountType.EXPENSE],
      ['641001', 'Gasto de personal — estructura', AccountType.EXPENSE],
      ['642001', 'Seguridad Social a cargo de la empresa', AccountType.EXPENSE],
      ['643001', 'Gastos derivados de personal', AccountType.EXPENSE],
      ['472001', 'Hacienda Pública, IVA soportado', AccountType.ASSET],
      ['400001', 'Proveedores / Pendiente de pago', AccountType.LIABILITY],
      ['570001', 'Tesorería general', AccountType.ASSET],
    ];
    for (const [code, nombre, type] of cuentas) {
      await accountingService.crearCuenta({ nombre, code, type, esCuentaDeDinero: code === '570001' });
    }
  }

  async function crearCategoriaPersonal() {
    return categoriaGastoService.sembrarPredefinidaSiNoExiste({
      nombre: 'Personal: Pago a empleado',
      cuentaContableId: null,
      requiereEmpleado: true,
      esPagoPersonal: true,
      aplicaIva: false,
    }).then(() => categoriaGastoService.listarConUso().then((all) => all.find((c) => c.categoria.nombre === 'Personal: Pago a empleado')!.categoria));
  }

  async function crearCategoriaNormal(aplicaIva: boolean, code = '629006') {
    return categoriaGastoService.crear('Gestoría', code, false, aplicaIva);
  }

  async function crearEmpleado(regimen: RegimenEmpleado) {
    return empleadoService.crear('Juan', 'malabarista', regimen);
  }

  it('categoría normal sin IVA: una línea de débito a la cuenta de la categoría', async () => {
    await crearCuentasBase();
    const categoria = await crearCategoriaNormal(false);
    const cuentaPago = await accountingService.obtenerCuentaPorCodigo('570001');

    const gasto = await service.crear({
      categoriaId: categoria.id,
      fecha: new Date('2026-07-10'),
      descripcion: 'Gestoría de julio',
      estadoPago: EstadoPagoGasto.PAGADO,
      cuentaPagoId: cuentaPago.id,
      importe: 80,
    });

    expect(gasto.importe.equals(new Decimal(80))).toBe(true);
    expect(gasto.tipoFiscal).toBeUndefined();
    const cuentaCategoria = await accountingService.obtenerCuentaPorId(categoria.cuentaContableId!);
    expect((await accountingService.saldoPorCuenta(cuentaCategoria.id)).equals(new Decimal(80))).toBe(true);
  });

  it('categoría normal con IVA tipoFiscal=B: comportamiento simple, sin repartir', async () => {
    await crearCuentasBase();
    const categoria = await crearCategoriaNormal(true);
    const cuentaPago = await accountingService.obtenerCuentaPorCodigo('570001');

    const gasto = await service.crear({
      categoriaId: categoria.id,
      fecha: new Date('2026-07-10'),
      descripcion: 'Gestoría de julio',
      estadoPago: EstadoPagoGasto.PAGADO,
      cuentaPagoId: cuentaPago.id,
      importe: 80,
      tipoFiscal: TipoFiscal.B,
    });

    expect(gasto.importe.equals(new Decimal(80))).toBe(true);
    expect(gasto.tipoFiscal).toBe(TipoFiscal.B);
    expect(gasto.importeIva?.equals(new Decimal(0))).toBe(true);
    const cuenta472001 = await accountingService.obtenerCuentaPorCodigo('472001');
    expect((await accountingService.saldoPorCuenta(cuenta472001.id)).equals(new Decimal(0))).toBe(true);
  });

  it('categoría normal con IVA tipoFiscal=A: reparte en base imponible + IVA soportado (472001)', async () => {
    await crearCuentasBase();
    const categoria = await crearCategoriaNormal(true);
    const cuentaPago = await accountingService.obtenerCuentaPorCodigo('570001');

    const gasto = await service.crear({
      categoriaId: categoria.id,
      fecha: new Date('2026-07-10'),
      descripcion: 'Material de montaje',
      estadoPago: EstadoPagoGasto.PAGADO,
      cuentaPagoId: cuentaPago.id,
      tipoFiscal: TipoFiscal.A,
      baseImponible: 100,
      ivaPercent: 21,
    });

    expect(gasto.importe.equals(new Decimal(121))).toBe(true);
    expect(gasto.baseImponible?.equals(new Decimal(100))).toBe(true);
    expect(gasto.importeIva?.equals(new Decimal(21))).toBe(true);

    const cuentaCategoria = await accountingService.obtenerCuentaPorId(categoria.cuentaContableId!);
    expect((await accountingService.saldoPorCuenta(cuentaCategoria.id)).equals(new Decimal(100))).toBe(true);
    const cuenta472001 = await accountingService.obtenerCuentaPorCodigo('472001');
    expect((await accountingService.saldoPorCuenta(cuenta472001.id)).equals(new Decimal(21))).toBe(true);
    const cuentaPagoResuelta = await accountingService.obtenerCuentaPorId(cuentaPago.id);
    expect((await accountingService.saldoPorCuenta(cuentaPagoResuelta.id)).equals(new Decimal(-121))).toBe(true);
  });

  it('personal CUENTA_AJENA: SALARIO a 640001/641001 y SEGURIDAD_SOCIAL a 642001, sin IVA nunca', async () => {
    await crearCuentasBase();
    const categoria = await crearCategoriaPersonal();
    const empleado = await crearEmpleado(RegimenEmpleado.CUENTA_AJENA);
    const plaza = await plazaService.crear('Feria de Julio', 'Madrid');
    const cuentaPago = await accountingService.obtenerCuentaPorCodigo('570001');

    const gasto = await service.crear({
      categoriaId: categoria.id,
      fecha: new Date('2026-07-10'),
      descripcion: 'Pago a Juan',
      estadoPago: EstadoPagoGasto.PAGADO,
      cuentaPagoId: cuentaPago.id,
      plazaId: plaza.id,
      empleadoId: empleado.id,
      conceptos: [
        { concepto: ConceptoPersonal.SALARIO, importe: 100 },
        { concepto: ConceptoPersonal.SEGURIDAD_SOCIAL, importe: 30 },
        { concepto: ConceptoPersonal.DIETA, importe: 20 },
      ],
    });

    expect(gasto.importe.equals(new Decimal(150))).toBe(true);
    expect(gasto.tipoFiscal).toBeUndefined();
    const cuenta640001 = await accountingService.obtenerCuentaPorCodigo('640001');
    expect((await accountingService.saldoPorCuenta(cuenta640001.id)).equals(new Decimal(100))).toBe(true);
    const cuenta642001 = await accountingService.obtenerCuentaPorCodigo('642001');
    expect((await accountingService.saldoPorCuenta(cuenta642001.id)).equals(new Decimal(30))).toBe(true);
    const cuenta643001 = await accountingService.obtenerCuentaPorCodigo('643001');
    expect((await accountingService.saldoPorCuenta(cuenta643001.id)).equals(new Decimal(20))).toBe(true);
  });

  it('personal sin plaza (ej. cuota de autónomo): SALARIO va a 641001', async () => {
    await crearCuentasBase();
    const categoria = await crearCategoriaPersonal();
    const empleado = await crearEmpleado(RegimenEmpleado.AUTONOMO);
    const cuentaPago = await accountingService.obtenerCuentaPorCodigo('570001');

    await service.crear({
      categoriaId: categoria.id,
      fecha: new Date('2026-07-10'),
      descripcion: 'Cuota de autónomo',
      estadoPago: EstadoPagoGasto.PAGADO,
      cuentaPagoId: cuentaPago.id,
      empleadoId: empleado.id,
      conceptos: [{ concepto: ConceptoPersonal.SALARIO, importe: 300 }],
    });

    const cuenta641001 = await accountingService.obtenerCuentaPorCodigo('641001');
    expect((await accountingService.saldoPorCuenta(cuenta641001.id)).equals(new Decimal(300))).toBe(true);
  });

  it('personal AUTONOMO con SALARIO tipoFiscal=A: reparte esa línea en base + IVA soportado', async () => {
    await crearCuentasBase();
    const categoria = await crearCategoriaPersonal();
    const empleado = await crearEmpleado(RegimenEmpleado.AUTONOMO);
    const plaza = await plazaService.crear('Feria de Julio', 'Madrid');
    const cuentaPago = await accountingService.obtenerCuentaPorCodigo('570001');

    const gasto = await service.crear({
      categoriaId: categoria.id,
      fecha: new Date('2026-07-10'),
      descripcion: 'Pago a artista autónomo',
      estadoPago: EstadoPagoGasto.PAGADO,
      cuentaPagoId: cuentaPago.id,
      plazaId: plaza.id,
      empleadoId: empleado.id,
      conceptos: [
        { concepto: ConceptoPersonal.SALARIO, tipoFiscal: TipoFiscal.A, baseImponible: 100, ivaPercent: 21 },
      ],
    });

    expect(gasto.importe.equals(new Decimal(121))).toBe(true);
    expect(gasto.tipoFiscal).toBe(TipoFiscal.A);
    const cuenta640001 = await accountingService.obtenerCuentaPorCodigo('640001');
    expect((await accountingService.saldoPorCuenta(cuenta640001.id)).equals(new Decimal(100))).toBe(true);
    const cuenta472001 = await accountingService.obtenerCuentaPorCodigo('472001');
    expect((await accountingService.saldoPorCuenta(cuenta472001.id)).equals(new Decimal(21))).toBe(true);
  });

  it('rechaza SEGURIDAD_SOCIAL si el empleado es AUTONOMO', async () => {
    await crearCuentasBase();
    const categoria = await crearCategoriaPersonal();
    const empleado = await crearEmpleado(RegimenEmpleado.AUTONOMO);
    const cuentaPago = await accountingService.obtenerCuentaPorCodigo('570001');

    await expect(
      service.crear({
        categoriaId: categoria.id,
        fecha: new Date('2026-07-10'),
        descripcion: 'x',
        estadoPago: EstadoPagoGasto.PAGADO,
        cuentaPagoId: cuentaPago.id,
        empleadoId: empleado.id,
        conceptos: [
          { concepto: ConceptoPersonal.SALARIO, importe: 100 },
          { concepto: ConceptoPersonal.SEGURIDAD_SOCIAL, importe: 30 },
        ],
      }),
    ).rejects.toThrow(/SEGURIDAD_SOCIAL solo aplica a empleados CUENTA_AJENA/i);
  });

  it('rechaza tipoFiscal en SALARIO si el empleado es CUENTA_AJENA', async () => {
    await crearCuentasBase();
    const categoria = await crearCategoriaPersonal();
    const empleado = await crearEmpleado(RegimenEmpleado.CUENTA_AJENA);
    const cuentaPago = await accountingService.obtenerCuentaPorCodigo('570001');

    await expect(
      service.crear({
        categoriaId: categoria.id,
        fecha: new Date('2026-07-10'),
        descripcion: 'x',
        estadoPago: EstadoPagoGasto.PAGADO,
        cuentaPagoId: cuentaPago.id,
        empleadoId: empleado.id,
        conceptos: [{ concepto: ConceptoPersonal.SALARIO, tipoFiscal: TipoFiscal.B, importe: 100 }],
      }),
    ).rejects.toThrow(/CUENTA_AJENA nunca lleva IVA/i);
  });

  it('un gasto PENDIENTE_PAGO no requiere cuentaPagoId y credita Proveedores (400001)', async () => {
    await crearCuentasBase();
    const categoria = await crearCategoriaNormal(false);

    const gasto = await service.crear({
      categoriaId: categoria.id,
      fecha: new Date('2026-07-10'),
      descripcion: 'Factura a 30 días',
      estadoPago: EstadoPagoGasto.PENDIENTE_PAGO,
      importe: 120,
    });

    expect(gasto.estadoPago).toBe(EstadoPagoGasto.PENDIENTE_PAGO);
    const cuenta400001 = await accountingService.obtenerCuentaPorCodigo('400001');
    expect((await accountingService.saldoPorCuenta(cuenta400001.id)).equals(new Decimal(120))).toBe(true);
  });

  it('pagarPendiente liquida contra Proveedores y marca el gasto como PAGADO', async () => {
    await crearCuentasBase();
    const categoria = await crearCategoriaNormal(false);
    const cuentaPago = await accountingService.obtenerCuentaPorCodigo('570001');

    const gasto = await service.crear({
      categoriaId: categoria.id,
      fecha: new Date('2026-07-10'),
      descripcion: 'Factura a 30 días',
      estadoPago: EstadoPagoGasto.PENDIENTE_PAGO,
      importe: 120,
    });

    const pagado = await service.pagarPendiente(gasto.id, cuentaPago.id);
    expect(pagado.estadoPago).toBe(EstadoPagoGasto.PAGADO);

    const cuenta400001 = await accountingService.obtenerCuentaPorCodigo('400001');
    expect((await accountingService.saldoPorCuenta(cuenta400001.id)).equals(new Decimal(0))).toBe(true);

    await expect(service.pagarPendiente(gasto.id, cuentaPago.id)).rejects.toThrow(/ya está pagado/i);
  });

  it('rechaza un gasto PAGADO sin cuentaPagoId', async () => {
    await crearCuentasBase();
    const categoria = await crearCategoriaNormal(false);
    await expect(
      service.crear({
        categoriaId: categoria.id,
        fecha: new Date('2026-07-10'),
        descripcion: 'x',
        estadoPago: EstadoPagoGasto.PAGADO,
        importe: 10,
      }),
    ).rejects.toThrow(/cuentaPagoId es obligatorio/i);
  });

  it('rechaza un gasto de categoría con requiereEmpleado sin empleadoId', async () => {
    await crearCuentasBase();
    const categoria = await crearCategoriaPersonal();
    const cuentaPago = await accountingService.obtenerCuentaPorCodigo('570001');
    await expect(
      service.crear({
        categoriaId: categoria.id,
        fecha: new Date('2026-07-10'),
        descripcion: 'x',
        estadoPago: EstadoPagoGasto.PAGADO,
        cuentaPagoId: cuentaPago.id,
        conceptos: [{ concepto: ConceptoPersonal.SALARIO, importe: 100 }],
      }),
    ).rejects.toThrow(/empleadoId es obligatorio/i);
  });

  it('rechaza crear un gasto si la plaza indicada no existe', async () => {
    await crearCuentasBase();
    const categoria = await crearCategoriaNormal(false);
    const cuentaPago = await accountingService.obtenerCuentaPorCodigo('570001');
    await expect(
      service.crear({
        categoriaId: categoria.id,
        fecha: new Date('2026-07-10'),
        descripcion: 'x',
        estadoPago: EstadoPagoGasto.PAGADO,
        cuentaPagoId: cuentaPago.id,
        plazaId: 'no-existe',
        importe: 10,
      }),
    ).rejects.toThrow(/no encontrada/i);
  });

  it('lista gastos filtrando por plazaId, categoriaId y estadoPago', async () => {
    await crearCuentasBase();
    const categoriaA = await crearCategoriaNormal(false, '629006');
    const categoriaB = await crearCategoriaNormal(false, '629007');
    const plaza = await plazaService.crear('Feria de Julio', 'Madrid');
    const cuentaPago = await accountingService.obtenerCuentaPorCodigo('570001');

    await service.crear({
      categoriaId: categoriaA.id,
      fecha: new Date('2026-07-10'),
      descripcion: 'Con plaza',
      estadoPago: EstadoPagoGasto.PAGADO,
      cuentaPagoId: cuentaPago.id,
      plazaId: plaza.id,
      importe: 50,
    });
    await service.crear({
      categoriaId: categoriaB.id,
      fecha: new Date('2026-07-10'),
      descripcion: 'Sin plaza',
      estadoPago: EstadoPagoGasto.PENDIENTE_PAGO,
      importe: 40,
    });

    expect(await service.listar({ plazaId: plaza.id })).toHaveLength(1);
    expect(await service.listar({ categoriaId: categoriaB.id })).toHaveLength(1);
    expect(await service.listar({ estadoPago: EstadoPagoGasto.PENDIENTE_PAGO })).toHaveLength(1);
    expect(await service.listar()).toHaveLength(2);
  });

  describe('eliminar', () => {
    it('elimina un gasto PAGADO y revierte el saldo de las cuentas afectadas', async () => {
      await crearCuentasBase();
      const categoria = await crearCategoriaNormal(false);
      const cuentaPago = await accountingService.obtenerCuentaPorCodigo('570001');

      const gasto = await service.crear({
        categoriaId: categoria.id,
        fecha: new Date('2026-07-10'),
        descripcion: 'Gestoría',
        estadoPago: EstadoPagoGasto.PAGADO,
        cuentaPagoId: cuentaPago.id,
        importe: 80,
      });

      await service.eliminar(gasto.id);

      await expect(service.obtener(gasto.id)).rejects.toThrow(/no encontrado/i);
      const cuentaCategoria = await accountingService.obtenerCuentaPorId(categoria.cuentaContableId!);
      expect((await accountingService.saldoPorCuenta(cuentaCategoria.id)).equals(new Decimal(0))).toBe(true);
      expect((await accountingService.saldoPorCuenta(cuentaPago.id)).equals(new Decimal(0))).toBe(true);
    });

    it('elimina un gasto que fue PENDIENTE_PAGO y ya se pagó, revirtiendo ambos asientos', async () => {
      await crearCuentasBase();
      const categoria = await crearCategoriaNormal(false);
      const cuentaPago = await accountingService.obtenerCuentaPorCodigo('570001');

      const gasto = await service.crear({
        categoriaId: categoria.id,
        fecha: new Date('2026-07-10'),
        descripcion: 'Factura a 30 días',
        estadoPago: EstadoPagoGasto.PENDIENTE_PAGO,
        importe: 120,
      });
      const pagado = await service.pagarPendiente(gasto.id, cuentaPago.id);
      expect(pagado.journalEntryIds).toHaveLength(2);

      await service.eliminar(gasto.id);

      const cuenta400001 = await accountingService.obtenerCuentaPorCodigo('400001');
      expect((await accountingService.saldoPorCuenta(cuenta400001.id)).equals(new Decimal(0))).toBe(true);
      expect((await accountingService.saldoPorCuenta(cuentaPago.id)).equals(new Decimal(0))).toBe(true);
    });

    it('permite eliminar un gasto PENDIENTE_PAGO sin pagar', async () => {
      await crearCuentasBase();
      const categoria = await crearCategoriaNormal(false);

      const gasto = await service.crear({
        categoriaId: categoria.id,
        fecha: new Date('2026-07-10'),
        descripcion: 'Factura a 30 días',
        estadoPago: EstadoPagoGasto.PENDIENTE_PAGO,
        importe: 120,
      });

      await expect(service.eliminar(gasto.id)).resolves.toBeUndefined();
      const cuenta400001 = await accountingService.obtenerCuentaPorCodigo('400001');
      expect((await accountingService.saldoPorCuenta(cuenta400001.id)).equals(new Decimal(0))).toBe(true);
    });

    it('una categoría deja de estar "usada" tras eliminar su único gasto', async () => {
      await crearCuentasBase();
      const categoria = await crearCategoriaNormal(false);
      const cuentaPago = await accountingService.obtenerCuentaPorCodigo('570001');

      const gasto = await service.crear({
        categoriaId: categoria.id,
        fecha: new Date('2026-07-10'),
        descripcion: 'Gestoría',
        estadoPago: EstadoPagoGasto.PAGADO,
        cuentaPagoId: cuentaPago.id,
        importe: 80,
      });

      expect((await categoriaGastoService.obtenerConUso(categoria.id)).usada).toBe(true);
      await service.eliminar(gasto.id);
      expect((await categoriaGastoService.obtenerConUso(categoria.id)).usada).toBe(false);
    });
  });
});
