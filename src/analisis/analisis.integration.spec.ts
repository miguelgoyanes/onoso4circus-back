import { randomUUID } from 'crypto';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmTestModule } from '../test/typeorm-test.module';
import { AnalisisModule } from './analisis.module';
import { AnalisisService } from './application/analisis.service';
import { PlazaService } from '../plazas/application/plaza.service';
import { GastoService } from '../gastos/application/gasto.service';
import { CategoriaGastoService } from '../gastos/application/categoria-gasto.service';
import { EstadoPagoGasto } from '../gastos/domain/gasto';
import { ContratoIngresoService } from '../ventas/application/contrato-ingreso.service';
import { EstadoCobro } from '../ventas/domain/estado-cobro';
import { AccountingService } from '../accounting/application/accounting.service';
import { AccountType } from '../accounting/domain/account';

describe('Análisis (integración contra Postgres real)', () => {
  let analisisService: AnalisisService;
  let plazaService: PlazaService;
  let gastoService: GastoService;
  let categoriaGastoService: CategoriaGastoService;
  let contratoIngresoService: ContratoIngresoService;
  let accountingService: AccountingService;
  let moduleRef: import('@nestjs/testing').TestingModule;
  let cuentaPagoId: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmTestModule, AnalisisModule],
    }).compile();
    await moduleRef.init();

    analisisService = moduleRef.get(AnalisisService);
    plazaService = moduleRef.get(PlazaService);
    gastoService = moduleRef.get(GastoService);
    categoriaGastoService = moduleRef.get(CategoriaGastoService);
    contratoIngresoService = moduleRef.get(ContratoIngresoService);
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

  it('porPlaza y detallePlaza agregan ingresos (contrato) y gastos de una plaza concreta', async () => {
    const plaza = await plazaService.crear(`Plaza análisis ${randomUUID()}`, 'Ubicación test');
    const categorias = await categoriaGastoService.listarConUso();
    const categoriaGestoria = categorias.find(({ categoria }) => categoria.nombre === 'Gestoría')!.categoria;

    const fecha = new Date('2026-05-15T00:00:00.000Z');
    await contratoIngresoService.crear({
      cliente: 'Ayuntamiento test',
      concepto: 'Actuación',
      fecha,
      plazaId: plaza.id,
      estadoCobro: EstadoCobro.COBRADO,
      cuentaDestinoId: cuentaPagoId,
      importe: 1000,
    });
    await gastoService.crear({
      categoriaId: categoriaGestoria.id,
      fecha,
      descripcion: 'Gestoría test',
      estadoPago: EstadoPagoGasto.PAGADO,
      cuentaPagoId,
      plazaId: plaza.id,
      importe: 300,
    });

    const desde = new Date('2026-05-01T00:00:00.000Z');
    const hasta = new Date('2026-05-31T23:59:59.999Z');

    const resumenPlazas = await analisisService.porPlaza(desde, hasta);
    const miPlaza = resumenPlazas.find((r) => r.plazaId === plaza.id)!;
    expect(miPlaza.ingresos.equals(1000)).toBe(true);
    expect(miPlaza.gastos.equals(300)).toBe(true);
    expect(miPlaza.beneficio.equals(700)).toBe(true);

    const detalle = await analisisService.detallePlaza(plaza.id, desde, hasta);
    expect(detalle.ingresosContratos.equals(1000)).toBe(true);
    expect(detalle.ingresosTaquilla.equals(0)).toBe(true);
    expect(detalle.gastosPorCategoria.find((g) => g.categoriaNombre === 'Gestoría')?.importe.equals(300)).toBe(true);
    expect(detalle.beneficio.equals(700)).toBe(true);
  });

  it('porPlaza sin rango de fechas devuelve todas las plazas sin filtrar', async () => {
    const plaza = await plazaService.crear(`Plaza sin rango ${randomUUID()}`, 'Ubicación test');
    const resumenPlazas = await analisisService.porPlaza();
    expect(resumenPlazas.some((r) => r.plazaId === plaza.id)).toBe(true);
  });

  it('resumenGeneral devuelve una estructura coherente (patrimonio y periodos definidos)', async () => {
    const desde = new Date('2026-05-01T00:00:00.000Z');
    const hasta = new Date('2026-05-31T23:59:59.999Z');
    const resumen = await analisisService.resumenGeneral(desde, hasta);

    expect(resumen.patrimonioLiquido).toBeDefined();
    expect(resumen.periodoActual.ingresos.greaterThanOrEqualTo(1000)).toBe(true);
    expect(resumen.periodoActual.ventasContratos.greaterThanOrEqualTo(1000)).toBe(true);
    expect(resumen.gastosPendientes.count).toBeGreaterThanOrEqual(0);
    expect(resumen.cobrosPendientes.count).toBeGreaterThanOrEqual(0);
  });

  it('resumenActivos devuelve totales agregados sin lanzar error, incluso sin activos', async () => {
    const resumen = await analisisService.resumenActivos();
    expect(resumen.valorNetoContableTotal).toBeDefined();
    expect(resumen.amortizacionAcumuladaTotal).toBeDefined();
    expect(Array.isArray(resumen.porCategoria)).toBe(true);
  });

  it('flujoCaja agrupa entradas/salidas por mes dentro del rango', async () => {
    const desde = new Date('2026-05-01T00:00:00.000Z');
    const hasta = new Date('2026-05-31T23:59:59.999Z');
    const puntos = await analisisService.flujoCaja(desde, hasta);

    expect(puntos.every((p) => /^\d{4}-\d{2}$/.test(p.periodo))).toBe(true);
    const mayo = puntos.find((p) => p.periodo === '2026-05');
    expect(mayo).toBeDefined();
    expect(mayo!.entradas.greaterThanOrEqualTo(1000)).toBe(true);
  });
});
