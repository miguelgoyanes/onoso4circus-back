import { randomUUID } from 'crypto';
import { NotFoundException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmTestModule } from '../test/typeorm-test.module';
import { GastosModule } from './gastos.module';
import { GastosController } from './api/gastos.controller';
import { CategoriasGastoController } from './api/categorias-gasto.controller';
import { EstadoPagoGasto } from './domain/gasto';
import { ConceptoPersonal } from './domain/concepto-personal';
import { TipoFiscal } from './domain/tipo-fiscal';
import { PlazaService } from '../plazas/application/plaza.service';
import { EmpleadoService } from '../personal/application/empleado.service';
import { RegimenEmpleado } from '../personal/domain/regimen-empleado';
import { AccountingService } from '../accounting/application/accounting.service';
import { AccountType } from '../accounting/domain/account';

describe('Gastos (integración contra Postgres real)', () => {
  let gastosController: GastosController;
  let categoriasController: CategoriasGastoController;
  let plazaService: PlazaService;
  let empleadoService: EmpleadoService;
  let accountingService: AccountingService;
  let moduleRef: import('@nestjs/testing').TestingModule;

  async function nuevaCuentaPago(): Promise<{ id: string }> {
    const testId = randomUUID();
    return accountingService.crearCuenta({
      nombre: `Banco ${testId}`,
      code: `572${testId.replace(/-/g, '').slice(0, 3)}`,
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });
  }

  async function categoriaPorNombre(nombre: string) {
    const todas = await categoriasController.listar();
    const encontrada = todas.find((c) => c.nombre === nombre);
    if (!encontrada) throw new Error(`Categoría "${nombre}" no encontrada — ¿falló el seed?`);
    return encontrada;
  }

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmTestModule, GastosModule],
    }).compile();
    // .compile() no dispara OnModuleInit por sí solo — hace falta .init() para que
    // corra el seed automático de categorías/cuentas predefinidas (GastosSeedService).
    await moduleRef.init();

    gastosController = moduleRef.get(GastosController);
    categoriasController = moduleRef.get(CategoriasGastoController);
    plazaService = moduleRef.get(PlazaService);
    empleadoService = moduleRef.get(EmpleadoService);
    accountingService = moduleRef.get(AccountingService);

    // El seed automático (GastosSeedService, OnModuleInit) corre al compilar el módulo.
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('siembra las categorías predefinidas al arrancar el módulo', async () => {
    const todas = await categoriasController.listar();
    const nombres = todas.map((c) => c.nombre);
    expect(nombres).toEqual(
      expect.arrayContaining(['Personal: Pago a empleado', 'Montaje', 'Gestoría', 'Comisiones bancarias']),
    );
    const personal = todas.find((c) => c.nombre === 'Personal: Pago a empleado')!;
    expect(personal.esPagoPersonal).toBe(true);
    expect(personal.esPredefinida).toBe(true);
    expect(personal.cuentaContableId).toBeNull();
  });

  it('registra un gasto de categoría de plaza (Montaje) y refleja el saldo en la cuenta de pago', async () => {
    const testId = randomUUID();
    const cuentaPago = await nuevaCuentaPago();
    const plaza = await plazaService.crear(`Feria de Julio ${testId}`, 'Madrid');
    const montaje = await categoriaPorNombre('Montaje');

    const gasto = await gastosController.crear({
      categoriaId: montaje.id,
      fecha: '2026-07-10',
      descripcion: 'Montaje de carpa (test integración)',
      estadoPago: EstadoPagoGasto.PAGADO,
      cuentaPagoId: cuentaPago.id,
      plazaId: plaza.id,
      importe: 300,
    });

    expect(gasto.plazaId).toBe(plaza.id);
    expect(gasto.importe).toBe('300');

    const saldoPago = await accountingService.saldoPorCuenta(cuentaPago.id);
    expect(saldoPago.toString()).toBe('-300');

    const gastosDeLaPlaza = await gastosController.listar({ plazaId: plaza.id });
    expect(gastosDeLaPlaza.map((g) => g.id)).toContain(gasto.id);
  });

  it('registra un gasto con IVA (tipoFiscal=A) repartiendo base + IVA soportado', async () => {
    const cuentaPago = await nuevaCuentaPago();
    const gestoria = await categoriaPorNombre('Gestoría');
    expect(gestoria.aplicaIva).toBe(true);

    const gasto = await gastosController.crear({
      categoriaId: gestoria.id,
      fecha: '2026-07-10',
      descripcion: 'Factura de gestoría con IVA',
      estadoPago: EstadoPagoGasto.PAGADO,
      cuentaPagoId: cuentaPago.id,
      tipoFiscal: TipoFiscal.A,
      baseImponible: 100,
      ivaPercent: 21,
    });

    expect(gasto.importe).toBe('121');
    expect(gasto.baseImponible).toBe('100');
    expect(gasto.importeIva).toBe('21');
  });

  it('registra un gasto de personal para un empleado AUTONOMO sin plaza (cuota de autónomo)', async () => {
    const testId = randomUUID();
    const cuentaPago = await nuevaCuentaPago();
    const personal = await categoriaPorNombre('Personal: Pago a empleado');
    const empleado = await empleadoService.crear(`Brandon ${testId}`, 'dueño', RegimenEmpleado.AUTONOMO);

    const gasto = await gastosController.crear({
      categoriaId: personal.id,
      fecha: '2026-07-10',
      descripcion: 'Cuota de autónomo (test integración)',
      estadoPago: EstadoPagoGasto.PAGADO,
      cuentaPagoId: cuentaPago.id,
      empleadoId: empleado.id,
      conceptos: [{ concepto: ConceptoPersonal.SALARIO, importe: 250 }],
    });

    expect(gasto.empleadoId).toBe(empleado.id);
    expect(gasto.importe).toBe('250');

    const saldoPago = await accountingService.saldoPorCuenta(cuentaPago.id);
    expect(saldoPago.toString()).toBe('-250');
  });

  it('registra un gasto GENERAL como PENDIENTE_PAGO, lo liquida, y luego lo elimina', async () => {
    const cuentaPago = await nuevaCuentaPago();
    const gestoria = await categoriaPorNombre('Gestoría');

    const gasto = await gastosController.crear({
      categoriaId: gestoria.id,
      fecha: '2026-07-10',
      descripcion: 'Factura de gestoría (test integración)',
      estadoPago: EstadoPagoGasto.PENDIENTE_PAGO,
      importe: 90,
      tipoFiscal: TipoFiscal.B,
    });

    expect(gasto.estadoPago).toBe(EstadoPagoGasto.PENDIENTE_PAGO);

    const pagado = await gastosController.pagar(gasto.id, { cuentaPagoId: cuentaPago.id });
    expect(pagado.estadoPago).toBe(EstadoPagoGasto.PAGADO);

    const saldoPago = await accountingService.saldoPorCuenta(cuentaPago.id);
    expect(saldoPago.toString()).toBe('-90');

    await gastosController.eliminar(gasto.id);
    await expect(gastosController.listar({}).then((lista) => lista.find((g) => g.id === gasto.id))).resolves.toBeUndefined();

    const saldoPagoTrasEliminar = await accountingService.saldoPorCuenta(cuentaPago.id);
    expect(saldoPagoTrasEliminar.toString()).toBe('0');
  });

  it('rechaza registrar un gasto para una plaza inexistente', async () => {
    const cuentaPago = await nuevaCuentaPago();
    const montaje = await categoriaPorNombre('Montaje');

    await expect(
      gastosController.crear({
        categoriaId: montaje.id,
        fecha: '2026-07-10',
        descripcion: 'x',
        estadoPago: EstadoPagoGasto.PAGADO,
        cuentaPagoId: cuentaPago.id,
        plazaId: '00000000-0000-0000-0000-000000000000',
        importe: 10,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('crea, edita y elimina una categoría personalizada respetando las reglas de congelación', async () => {
    const testId = randomUUID();
    const creada = await categoriasController.crear({
      nombre: `Combustible ${testId}`,
      cuentaContableCode: `629${testId.replace(/-/g, '').slice(0, 3)}`,
      requiereEmpleado: false,
      aplicaIva: true,
    });
    expect(creada.esPredefinida).toBe(false);
    expect(creada.usada).toBe(false);

    const editada = await categoriasController.actualizar(creada.id, {
      nombre: `Gasolina ${testId}`,
      aplicaIva: false,
      requiereEmpleado: false,
    });
    expect(editada.nombre).toBe(`Gasolina ${testId}`);

    await categoriasController.eliminar(creada.id);
    await expect(categoriasController.obtener(creada.id)).rejects.toThrow(NotFoundException);
  });
});
