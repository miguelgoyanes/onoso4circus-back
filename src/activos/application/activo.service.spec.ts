import { ForbiddenException } from '@nestjs/common';
import { AccountingService } from '../../accounting/application/accounting.service';
import { AccountType } from '../../accounting/domain/account';
import { InMemoryJournalEntryRepository } from '../../accounting/infrastructure/in-memory-journal-entry.repository';
import { InMemoryAccountRepository } from '../../accounting/infrastructure/in-memory-account.repository';
import { InMemoryActivoRepository } from '../infrastructure/in-memory-activo.repository';
import { InMemoryCategoriaActivoRepository } from '../infrastructure/in-memory-categoria-activo.repository';
import { CategoriaActivoService } from './categoria-activo.service';
import { ActivoService } from './activo.service';
import { TipoFiscal } from '../domain/tipo-fiscal';

function haceMeses(meses: number): Date {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - meses);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

describe('ActivoService', () => {
  let accountingService: AccountingService;
  let categoriaService: CategoriaActivoService;
  let service: ActivoService;
  let categoriaId: string;
  let cuentaPagoId: string;

  beforeEach(async () => {
    accountingService = new AccountingService(new InMemoryJournalEntryRepository(), new InMemoryAccountRepository());
    const activoRepo = new InMemoryActivoRepository();
    categoriaService = new CategoriaActivoService(new InMemoryCategoriaActivoRepository(), activoRepo, accountingService);
    service = new ActivoService(activoRepo, categoriaService, accountingService);

    await accountingService.crearCuenta({ nombre: 'IVA soportado', code: '472001', type: AccountType.ASSET, esCuentaDeDinero: false });
    await accountingService.crearCuenta({ nombre: 'Amortización acumulada', code: '281001', type: AccountType.ASSET, esCuentaDeDinero: false });
    await accountingService.crearCuenta({ nombre: 'Amortización', code: '680001', type: AccountType.EXPENSE, esCuentaDeDinero: false });
    const cuentaPago = await accountingService.crearCuenta({ nombre: 'Caja', code: '570001', type: AccountType.ASSET, esCuentaDeDinero: true });
    cuentaPagoId = cuentaPago.id;

    const categoria = await categoriaService.crear('Carpa y estructura', '210001', true);
    categoriaId = categoria.id;
  });

  it('crea un activo con tipoFiscal=A repartiendo base + IVA soportado', async () => {
    const activo = await service.crear({
      categoriaId,
      nombre: 'Carpa principal',
      fechaCompra: new Date(),
      cuentaPagoId,
      tipoFiscal: TipoFiscal.A,
      baseImponible: 1000,
      ivaPercent: 21,
      vidaUtilAnios: 10,
      valorResidual: 0,
    });

    expect(activo.coste.equals(1210)).toBe(true);
    expect(activo.baseImponible?.equals(1000)).toBe(true);
    expect(activo.importeIva?.equals(210)).toBe(true);
    const cuentaActivo = await accountingService.obtenerCuentaPorCodigo('210001');
    expect((await accountingService.saldoPorCuenta(cuentaActivo.id)).equals(1000)).toBe(true);
    const cuentaIva = await accountingService.obtenerCuentaPorCodigo('472001');
    expect((await accountingService.saldoPorCuenta(cuentaIva.id)).equals(210)).toBe(true);
    expect((await accountingService.saldoPorCuenta(cuentaPagoId)).equals(-1210)).toBe(true);
  });

  it('crea un activo con tipoFiscal=B usando el importe completo sin repartir', async () => {
    const activo = await service.crear({
      categoriaId,
      nombre: 'Sillas plegables',
      fechaCompra: new Date(),
      cuentaPagoId,
      tipoFiscal: TipoFiscal.B,
      importe: 500,
      vidaUtilAnios: 5,
      valorResidual: 0,
    });

    expect(activo.coste.equals(500)).toBe(true);
    expect(activo.importeIva?.equals(0)).toBe(true);
  });

  it('rechaza valorResidual mayor que el coste', async () => {
    await expect(
      service.crear({
        categoriaId,
        nombre: 'Altavoces',
        fechaCompra: new Date(),
        cuentaPagoId,
        tipoFiscal: TipoFiscal.B,
        importe: 300,
        vidaUtilAnios: 5,
        valorResidual: 400,
      }),
    ).rejects.toThrow(/valorResidual/i);
  });

  it('rechaza vidaUtilAnios <= 0', async () => {
    await expect(
      service.crear({
        categoriaId,
        nombre: 'Altavoces',
        fechaCompra: new Date(),
        cuentaPagoId,
        tipoFiscal: TipoFiscal.B,
        importe: 300,
        vidaUtilAnios: 0,
        valorResidual: 0,
      }),
    ).rejects.toThrow(/vidaUtilAnios/i);
  });

  describe('amortización automática al consultar', () => {
    it('un activo recién comprado (0 meses transcurridos) no amortiza nada', async () => {
      const creado = await service.crear({
        categoriaId,
        nombre: 'Carpa principal',
        fechaCompra: new Date(),
        cuentaPagoId,
        tipoFiscal: TipoFiscal.B,
        importe: 1200,
        vidaUtilAnios: 10,
        valorResidual: 0,
      });

      const obtenido = await service.obtener(creado.id);
      expect(obtenido.amortizacionAcumulada.equals(0)).toBe(true);
    });

    it('pone al día varios meses de golpe en un único asiento', async () => {
      const creado = await service.crear({
        categoriaId,
        nombre: 'Carpa principal',
        fechaCompra: haceMeses(3),
        cuentaPagoId,
        tipoFiscal: TipoFiscal.B,
        importe: 1200,
        vidaUtilAnios: 10, // 1200/120 meses = 10€/mes
        valorResidual: 0,
      });

      const obtenido = await service.obtener(creado.id);
      expect(obtenido.amortizacionAcumulada.equals(30)).toBe(true); // 10€ x 3 meses
      expect(obtenido.ultimaAmortizacionRegistradaEn).toBeDefined();

      const cuentaAcumulada = await accountingService.obtenerCuentaPorCodigo('281001');
      expect((await accountingService.saldoPorCuenta(cuentaAcumulada.id)).equals(-30)).toBe(true);
      const cuentaGasto = await accountingService.obtenerCuentaPorCodigo('680001');
      expect((await accountingService.saldoPorCuenta(cuentaGasto.id)).equals(30)).toBe(true);

      // Una segunda consulta inmediata no vuelve a postear nada (0 meses nuevos transcurridos).
      const segundaConsulta = await service.obtener(creado.id);
      expect(segundaConsulta.amortizacionAcumulada.equals(30)).toBe(true);
    });

    it('nunca amortiza más allá de coste - valorResidual, aunque hayan pasado más meses que la vida útil', async () => {
      const creado = await service.crear({
        categoriaId,
        nombre: 'Palomitera',
        fechaCompra: haceMeses(36), // vida útil de 1 año = 12 meses, muy superado
        cuentaPagoId,
        tipoFiscal: TipoFiscal.B,
        importe: 120,
        vidaUtilAnios: 1,
        valorResidual: 20,
      });

      const obtenido = await service.obtener(creado.id);
      expect(obtenido.amortizacionAcumulada.equals(100)).toBe(true); // 120 - 20, nunca más
    });

    it('un activo dado de baja deja de amortizar', async () => {
      const creado = await service.crear({
        categoriaId,
        nombre: 'Carpa principal',
        fechaCompra: haceMeses(2),
        cuentaPagoId,
        tipoFiscal: TipoFiscal.B,
        importe: 1200,
        vidaUtilAnios: 10,
        valorResidual: 0,
      });
      await service.darDeBaja(creado.id);

      const obtenido = await service.obtener(creado.id);
      expect(obtenido.amortizacionAcumulada.equals(0)).toBe(true);
      expect(obtenido.activo).toBe(false);
    });
  });

  describe('actualizar', () => {
    it('permite editar nombre/vidaUtilAnios/valorResidual sin tocar el asiento de compra', async () => {
      const creado = await service.crear({
        categoriaId,
        nombre: 'Carpa principal',
        fechaCompra: new Date(),
        cuentaPagoId,
        tipoFiscal: TipoFiscal.B,
        importe: 1200,
        vidaUtilAnios: 10,
        valorResidual: 0,
      });

      const actualizado = await service.actualizar(creado.id, { nombre: 'Carpa grande', vidaUtilAnios: 8, valorResidual: 100 });
      expect(actualizado.nombre).toBe('Carpa grande');
      expect(actualizado.vidaUtilAnios).toBe(8);
      expect(actualizado.valorResidual.equals(100)).toBe(true);
      expect(actualizado.coste.equals(1200)).toBe(true);
    });

    it('permite cambiar datos económicos mientras no haya amortización registrada', async () => {
      const creado = await service.crear({
        categoriaId,
        nombre: 'Carpa principal',
        fechaCompra: new Date('2026-01-01'),
        cuentaPagoId,
        tipoFiscal: TipoFiscal.B,
        importe: 1200,
        vidaUtilAnios: 10,
        valorResidual: 0,
      });

      const actualizado = await service.actualizar(creado.id, {
        nombre: 'Carpa principal',
        vidaUtilAnios: 10,
        valorResidual: 0,
        economia: {
          categoriaId,
          fechaCompra: new Date('2026-02-01'),
          cuentaPagoId,
          tipoFiscal: TipoFiscal.B,
          importe: 1500,
        },
      });

      expect(actualizado.coste.equals(1500)).toBe(true);
      expect((await accountingService.saldoPorCuenta(cuentaPagoId)).equals(-1500)).toBe(true);
    });

    it('rechaza cambiar datos económicos si ya hay amortización registrada', async () => {
      const creado = await service.crear({
        categoriaId,
        nombre: 'Carpa principal',
        fechaCompra: haceMeses(2),
        cuentaPagoId,
        tipoFiscal: TipoFiscal.B,
        importe: 1200,
        vidaUtilAnios: 10,
        valorResidual: 0,
      });
      await service.obtener(creado.id); // fuerza la puesta al día

      await expect(
        service.actualizar(creado.id, {
          nombre: 'Carpa principal',
          vidaUtilAnios: 10,
          valorResidual: 0,
          economia: { categoriaId, fechaCompra: new Date(), cuentaPagoId, tipoFiscal: TipoFiscal.B, importe: 999 },
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('eliminar', () => {
    it('elimina un activo sin amortización, revirtiendo el asiento de compra', async () => {
      const creado = await service.crear({
        categoriaId,
        nombre: 'Sillas',
        fechaCompra: new Date(),
        cuentaPagoId,
        tipoFiscal: TipoFiscal.B,
        importe: 200,
        vidaUtilAnios: 5,
        valorResidual: 0,
      });

      await service.eliminar(creado.id);
      expect((await accountingService.saldoPorCuenta(cuentaPagoId)).equals(0)).toBe(true);
      await expect(service.obtener(creado.id)).rejects.toThrow(/no encontrado/i);
    });

    it('bloquea eliminar un activo con amortización registrada', async () => {
      const creado = await service.crear({
        categoriaId,
        nombre: 'Carpa principal',
        fechaCompra: haceMeses(2),
        cuentaPagoId,
        tipoFiscal: TipoFiscal.B,
        importe: 1200,
        vidaUtilAnios: 10,
        valorResidual: 0,
      });
      await service.obtener(creado.id);

      await expect(service.eliminar(creado.id)).rejects.toThrow(/amortización registrada/i);
    });
  });
});
