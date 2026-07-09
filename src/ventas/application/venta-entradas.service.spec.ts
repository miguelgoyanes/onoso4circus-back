import Decimal from 'decimal.js';
import { Plaza } from '../../plazas/domain/plaza';
import { Fecha } from '../../plazas/domain/fecha';
import { Pase } from '../../plazas/domain/pase';
import { TipoActividad } from '../../plazas/domain/tipo-actividad';
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
import { TipoFiscal } from '../domain/tipo-fiscal';
import { OrigenVenta } from '../domain/origen-venta';
import { InMemoryTipoEntradaRepository } from '../infrastructure/in-memory-tipo-entrada.repository';
import { InMemoryVentaEntradasRepository } from '../infrastructure/in-memory-venta-entradas.repository';
import { TipoEntradaService } from './tipo-entrada.service';
import { VentaEntradasService } from './venta-entradas.service';

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

describe('VentaEntradasService', () => {
  let accountingService: AccountingService;
  let tipoEntradaService: TipoEntradaService;
  let service: VentaEntradasService;
  let paseId: string;
  let cuentaCobroId: string;

  beforeEach(async () => {
    const plazaRepo = new InMemoryPlazaRepository();
    const fechaRepo = new InMemoryFechaRepository();
    const plazaService = new PlazaService(plazaRepo);
    const fechaService = new FechaService(fechaRepo, plazaRepo);
    const paseService = new PaseService(new InMemoryPaseRepository(), fechaRepo);
    accountingService = new AccountingService(new InMemoryJournalEntryRepository(), new InMemoryAccountRepository());

    const ventaEntradasRepository = new InMemoryVentaEntradasRepository();
    tipoEntradaService = new TipoEntradaService(new InMemoryTipoEntradaRepository(), ventaEntradasRepository);
    service = new VentaEntradasService(
      ventaEntradasRepository,
      tipoEntradaService,
      paseService,
      fechaService,
      accountingService,
    );

    await accountingService.crearCuenta({
      nombre: 'Ingresos taquilla',
      code: '700001',
      type: AccountType.INCOME,
      esCuentaDeDinero: false,
    });
    await accountingService.crearCuenta({
      nombre: 'Hacienda Pública, IVA repercutido',
      code: '477001',
      type: AccountType.LIABILITY,
      esCuentaDeDinero: false,
    });
    const cuentaCobro = await accountingService.crearCuenta({
      nombre: 'Caja',
      code: '570001',
      type: AccountType.ASSET,
      esCuentaDeDinero: true,
    });
    cuentaCobroId = cuentaCobro.id;

    const plaza = await plazaService.crear('Plaza de Prueba', 'Madrid');
    const fecha = await fechaService.crear(plaza.id, new Date('2026-07-01'), TipoActividad.SHOW);
    const pase = await paseService.crear(fecha.id, '18:00');
    paseId = pase.id;
  });

  it('crearLote registra N ventas, cada una con su propio asiento (ingresos crédito / cuenta de cobro débito)', async () => {
    const general = await tipoEntradaService.crear('General', new Decimal(10), false);

    const [venta] = await service.crearLote(paseId, [
      { tipoEntradaId: general.id, cantidad: 5, cuentaCobroId, origen: OrigenVenta.FISICA },
    ]);

    expect(venta.precioUnitarioAplicado.equals(new Decimal(10))).toBe(true);
    const cuentaIngresos = await accountingService.obtenerCuentaPorCodigo('700001');
    expect((await accountingService.saldoPorCuenta(cuentaIngresos.id)).equals(new Decimal(50))).toBe(true);
    expect((await accountingService.saldoPorCuenta(cuentaCobroId)).equals(new Decimal(50))).toBe(true);
  });

  it('listar devuelve las ventas del más reciente al más antiguo', async () => {
    const general = await tipoEntradaService.crear('General', new Decimal(10), false);

    const [primera] = await service.crearLote(paseId, [
      { tipoEntradaId: general.id, cantidad: 1, cuentaCobroId, origen: OrigenVenta.FISICA },
    ]);
    // Separación real de reloj para no empatar creadoEn dentro del mismo milisegundo — en
    // producción esto nunca ocurre entre dos registros reales (implica dos confirmaciones
    // humanas simultáneas), solo hace falta forzarlo aquí porque el repo in-memory no tiene
    // la latencia real de una escritura a Postgres.
    await new Promise((resolve) => setTimeout(resolve, 2));
    const [segunda] = await service.crearLote(paseId, [
      { tipoEntradaId: general.id, cantidad: 1, cuentaCobroId, origen: OrigenVenta.FISICA },
    ]);

    const ventas = await service.listar({ paseId });

    expect(ventas.map((v) => v.id)).toEqual([segunda.id, primera.id]);
  });

  it('el total nunca depende de la clasificación fiscal: 10 entradas a 15€ son siempre 150€', async () => {
    const general = await tipoEntradaService.crear('General', new Decimal(15), true);

    const [ventaB] = await service.crearLote(paseId, [
      { tipoEntradaId: general.id, cantidad: 10, cuentaCobroId, origen: OrigenVenta.FISICA, tipoFiscal: TipoFiscal.B },
    ]);
    expect(ventaB.baseImponible?.equals(new Decimal(150))).toBe(true);
    expect(ventaB.importeIva?.equals(new Decimal(0))).toBe(true);

    const [ventaA] = await service.crearLote(paseId, [
      {
        tipoEntradaId: general.id,
        cantidad: 10,
        cuentaCobroId,
        origen: OrigenVenta.FISICA,
        tipoFiscal: TipoFiscal.A,
        ivaPercent: 21,
      },
    ]);
    // base + iva debe sumar exactamente 150, sin desviación de redondeo.
    expect(ventaA.baseImponible!.plus(ventaA.importeIva!).equals(new Decimal(150))).toBe(true);
    expect(ventaA.baseImponible?.equals(new Decimal('123.97'))).toBe(true);
    expect(ventaA.importeIva?.equals(new Decimal('26.03'))).toBe(true);

    const cuentaIngresos = await accountingService.obtenerCuentaPorCodigo('700001');
    const cuentaIva = await accountingService.obtenerCuentaPorCodigo('477001');
    // 150 (venta B, sin IVA) + 123.97 (base de la venta A)
    expect((await accountingService.saldoPorCuenta(cuentaIngresos.id)).equals(new Decimal('273.97'))).toBe(true);
    expect((await accountingService.saldoPorCuenta(cuentaIva.id)).equals(new Decimal('26.03'))).toBe(true);
  });

  describe('actualizar', () => {
    it('corrige cantidad revirtiendo y reponiendo el asiento', async () => {
      const general = await tipoEntradaService.crear('General', new Decimal(10), false);
      const [venta] = await service.crearLote(paseId, [
        { tipoEntradaId: general.id, cantidad: 2, cuentaCobroId, origen: OrigenVenta.FISICA },
      ]);

      const corregida = await service.actualizar(venta.id, {
        tipoEntradaId: general.id,
        cantidad: 3,
        cuentaCobroId,
        origen: OrigenVenta.FISICA,
      });

      expect(corregida.cantidad).toBe(3);
      const cuentaIngresos = await accountingService.obtenerCuentaPorCodigo('700001');
      expect((await accountingService.saldoPorCuenta(cuentaIngresos.id)).equals(new Decimal(30))).toBe(true);
    });
  });

  it('reclasificarLote pasa de B a A preservando el importe total exacto', async () => {
    const general = await tipoEntradaService.crear('General', new Decimal(15), true);
    const [venta] = await service.crearLote(paseId, [
      { tipoEntradaId: general.id, cantidad: 10, cuentaCobroId, origen: OrigenVenta.FISICA, tipoFiscal: TipoFiscal.B },
    ]);

    const [reclasificada] = await service.reclasificarLote([venta.id], TipoFiscal.A, 21);

    expect(reclasificada.tipoFiscal).toBe(TipoFiscal.A);
    expect(reclasificada.baseImponible!.plus(reclasificada.importeIva!).equals(new Decimal(150))).toBe(true);
    const cuentaCobro = cuentaCobroId;
    expect((await accountingService.saldoPorCuenta(cuentaCobro)).equals(new Decimal(150))).toBe(true);
  });

  it('eliminar revierte el asiento', async () => {
    const general = await tipoEntradaService.crear('General', new Decimal(10), false);
    const [venta] = await service.crearLote(paseId, [
      { tipoEntradaId: general.id, cantidad: 1, cuentaCobroId, origen: OrigenVenta.FISICA },
    ]);

    await service.eliminar(venta.id);

    await expect(service.obtener(venta.id)).rejects.toThrow(/no encontrada/i);
    const cuentaIngresos = await accountingService.obtenerCuentaPorCodigo('700001');
    expect((await accountingService.saldoPorCuenta(cuentaIngresos.id)).equals(new Decimal(0))).toBe(true);
  });
});
