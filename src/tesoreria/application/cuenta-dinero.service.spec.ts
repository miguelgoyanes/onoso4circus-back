import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';
import { AccountingService } from '../../accounting/application/accounting.service';
import { InMemoryJournalEntryRepository } from '../../accounting/infrastructure/in-memory-journal-entry.repository';
import { InMemoryAccountRepository } from '../../accounting/infrastructure/in-memory-account.repository';
import { AccountType, TipoCuentaDinero } from '../../accounting/domain/account';
import { JournalEntry } from '../../accounting/domain/journal-entry';
import { JournalLine } from '../../accounting/domain/journal-line';
import { InMemoryTransferenciaRepository } from '../infrastructure/in-memory-transferencia.repository';
import { InMemoryMovimientoCapitalRepository } from '../infrastructure/in-memory-movimiento-capital.repository';
import { InMemoryAjusteArqueoRepository } from '../infrastructure/in-memory-ajuste-arqueo.repository';
import { TipoMovimientoCapital } from '../domain/tipo-movimiento-capital';
import { CuentaDineroService } from './cuenta-dinero.service';

describe('CuentaDineroService', () => {
  let accountingService: AccountingService;
  let accountRepository: InMemoryAccountRepository;
  let service: CuentaDineroService;

  beforeEach(async () => {
    accountRepository = new InMemoryAccountRepository();
    accountingService = new AccountingService(new InMemoryJournalEntryRepository(), accountRepository);
    service = new CuentaDineroService(
      accountingService,
      accountRepository,
      new InMemoryTransferenciaRepository(),
      new InMemoryMovimientoCapitalRepository(),
      new InMemoryAjusteArqueoRepository(),
    );

    await accountingService.crearCuenta({ nombre: 'Capital', code: '100', type: AccountType.EQUITY, esCuentaDeDinero: false });
    await accountingService.crearCuenta({
      nombre: 'Diferencia de caja (falta)',
      code: '668001',
      type: AccountType.EXPENSE,
      esCuentaDeDinero: false,
    });
    await accountingService.crearCuenta({
      nombre: 'Diferencia de caja (sobra)',
      code: '778001',
      type: AccountType.INCOME,
      esCuentaDeDinero: false,
    });
  });

  it('crea cuentas CAJA y BANCO con código autoincremental por tipo, empezando en 001', async () => {
    const caja1 = await service.crear('Caja principal', TipoCuentaDinero.CAJA, true, false);
    const caja2 = await service.crear('Caja secundaria', TipoCuentaDinero.CAJA, false, true);
    const banco1 = await service.crear('Banco principal', TipoCuentaDinero.BANCO, false, false);

    expect(caja1.code).toBe('570001');
    expect(caja2.code).toBe('570002');
    expect(banco1.code).toBe('572001');
    expect(caja1.usableEnTaquilla).toBe(true);
    expect(caja1.usableEnBar).toBe(false);
    expect(caja1.activa).toBe(true);
  });

  it('listar solo devuelve cuentas creadas desde Tesorería, no las cuentas fijas de otros módulos', async () => {
    await accountingService.crearCuenta({
      nombre: 'Ingresos taquilla',
      code: '700001',
      type: AccountType.INCOME,
      esCuentaDeDinero: false,
    });
    await service.crear('Caja', TipoCuentaDinero.CAJA, false, false);

    const listado = await service.listar();

    expect(listado).toHaveLength(1);
    expect(listado[0].cuenta.code).toBe('570001');
    expect(listado[0].saldo.equals(0)).toBe(true);
  });

  it('actualizar cambia nombre y checks, pero no toca el tipo ni el código', async () => {
    const creada = await service.crear('Caja', TipoCuentaDinero.CAJA, false, false);

    const actualizada = await service.actualizar(creada.id, 'Caja renombrada', true, true);

    expect(actualizada.name).toBe('Caja renombrada');
    expect(actualizada.usableEnTaquilla).toBe(true);
    expect(actualizada.usableEnBar).toBe(true);
    expect(actualizada.code).toBe(creada.code);
    expect(actualizada.tipoCuentaDinero).toBe(TipoCuentaDinero.CAJA);
  });

  it('desactivar siempre funciona, con o sin movimientos; activar la revierte', async () => {
    const creada = await service.crear('Caja', TipoCuentaDinero.CAJA, false, false);
    await service.registrarMovimientoCapital(creada.id, TipoMovimientoCapital.ENTRADA, 50);

    const desactivada = await service.desactivar(creada.id);
    expect(desactivada.activa).toBe(false);

    const reactivada = await service.activar(creada.id);
    expect(reactivada.activa).toBe(true);
  });

  it('eliminar bloquea cuentas con movimientos y permite las que no tienen ninguno', async () => {
    const usada = await service.crear('Caja usada', TipoCuentaDinero.CAJA, false, false);
    await service.registrarMovimientoCapital(usada.id, TipoMovimientoCapital.ENTRADA, 10);
    const sinUsar = await service.crear('Caja libre', TipoCuentaDinero.CAJA, false, false);

    await expect(service.eliminar(usada.id)).rejects.toThrow(/no se puede eliminar/i);
    await service.eliminar(sinUsar.id);

    await expect(service.obtener(sinUsar.id)).rejects.toThrow(/no encontrada/i);
  });

  it('rechaza transferir o registrar capital sobre una cuenta desactivada', async () => {
    const cuenta = await service.crear('Caja', TipoCuentaDinero.CAJA, false, false);
    const otra = await service.crear('Banco', TipoCuentaDinero.BANCO, false, false);
    await service.desactivar(cuenta.id);

    await expect(service.transferir(cuenta.id, otra.id, 10)).rejects.toThrow(/desactivada/i);
    await expect(service.registrarMovimientoCapital(cuenta.id, TipoMovimientoCapital.ENTRADA, 10)).rejects.toThrow(
      /desactivada/i,
    );
  });

  describe('transferencias', () => {
    it('transferir mueve saldo y queda etiquetada como TRANSFERENCIA en movimientos()', async () => {
      const origen = await service.crear('Caja', TipoCuentaDinero.CAJA, false, false);
      const destino = await service.crear('Banco', TipoCuentaDinero.BANCO, false, false);
      await service.registrarMovimientoCapital(origen.id, TipoMovimientoCapital.ENTRADA, 100);

      const transferencia = await service.transferir(origen.id, destino.id, 30, 'nota');

      expect((await accountingService.saldoPorCuenta(origen.id)).equals(70)).toBe(true);
      expect((await accountingService.saldoPorCuenta(destino.id)).equals(30)).toBe(true);

      const movimientos = await service.movimientos(destino.id);
      const movTransferencia = movimientos.find((m) => m.journalEntryId === transferencia.journalEntryId);
      expect(movTransferencia?.origenTipo).toBe('TRANSFERENCIA');
      expect(movTransferencia?.origenId).toBe(transferencia.id);
    });

    it('rechaza transferir entre la misma cuenta', async () => {
      const cuenta = await service.crear('Caja', TipoCuentaDinero.CAJA, false, false);
      await expect(service.transferir(cuenta.id, cuenta.id, 10)).rejects.toThrow(/misma/i);
    });

    it('actualizarTransferencia revierte la anterior y aplica los nuevos valores', async () => {
      const origen = await service.crear('Caja', TipoCuentaDinero.CAJA, false, false);
      const destino = await service.crear('Banco', TipoCuentaDinero.BANCO, false, false);
      const otroDestino = await service.crear('Otro banco', TipoCuentaDinero.BANCO, false, false);
      await service.registrarMovimientoCapital(origen.id, TipoMovimientoCapital.ENTRADA, 100);
      const transferencia = await service.transferir(origen.id, destino.id, 30);

      await service.actualizarTransferencia(transferencia.id, origen.id, otroDestino.id, 50);

      expect((await accountingService.saldoPorCuenta(origen.id)).equals(50)).toBe(true);
      expect((await accountingService.saldoPorCuenta(destino.id)).equals(0)).toBe(true);
      expect((await accountingService.saldoPorCuenta(otroDestino.id)).equals(50)).toBe(true);
    });

    it('eliminarTransferencia revierte el asiento', async () => {
      const origen = await service.crear('Caja', TipoCuentaDinero.CAJA, false, false);
      const destino = await service.crear('Banco', TipoCuentaDinero.BANCO, false, false);
      await service.registrarMovimientoCapital(origen.id, TipoMovimientoCapital.ENTRADA, 100);
      const transferencia = await service.transferir(origen.id, destino.id, 30);

      await service.eliminarTransferencia(transferencia.id);

      expect((await accountingService.saldoPorCuenta(origen.id)).equals(100)).toBe(true);
      expect((await accountingService.saldoPorCuenta(destino.id)).equals(0)).toBe(true);
    });
  });

  describe('movimientos de capital', () => {
    it('registrarMovimientoCapital: ENTRADA suma, SALIDA resta, usando la cuenta 100 por debajo', async () => {
      const cuenta = await service.crear('Caja', TipoCuentaDinero.CAJA, false, false);

      const entrada = await service.registrarMovimientoCapital(cuenta.id, TipoMovimientoCapital.ENTRADA, 200);
      expect((await accountingService.saldoPorCuenta(cuenta.id)).equals(200)).toBe(true);

      await service.registrarMovimientoCapital(cuenta.id, TipoMovimientoCapital.SALIDA, 80, 'retirada personal');
      expect((await accountingService.saldoPorCuenta(cuenta.id)).equals(120)).toBe(true);

      const capital = await accountingService.obtenerCuentaPorCodigo('100');
      expect((await accountingService.saldoPorCuenta(capital.id)).equals(120)).toBe(true);

      const movimientos = await service.movimientos(cuenta.id);
      const movEntrada = movimientos.find((m) => m.journalEntryId === entrada.journalEntryId);
      expect(movEntrada?.origenTipo).toBe('CAPITAL');
      expect(movEntrada?.origenId).toBe(entrada.id);
    });

    it('actualizarMovimientoCapital revierte y reaplica con el nuevo importe/tipo', async () => {
      const cuenta = await service.crear('Caja', TipoCuentaDinero.CAJA, false, false);
      const entrada = await service.registrarMovimientoCapital(cuenta.id, TipoMovimientoCapital.ENTRADA, 200);

      await service.actualizarMovimientoCapital(entrada.id, TipoMovimientoCapital.SALIDA, 30);

      expect((await accountingService.saldoPorCuenta(cuenta.id)).equals(-30)).toBe(true);
    });

    it('eliminarMovimientoCapital revierte el asiento', async () => {
      const cuenta = await service.crear('Caja', TipoCuentaDinero.CAJA, false, false);
      const entrada = await service.registrarMovimientoCapital(cuenta.id, TipoMovimientoCapital.ENTRADA, 200);

      await service.eliminarMovimientoCapital(entrada.id);

      expect((await accountingService.saldoPorCuenta(cuenta.id)).equals(0)).toBe(true);
    });
  });

  describe('ajustes de arqueo', () => {
    it('crearAjusteArqueo con sobra: acredita 778001 y sube el saldo de la caja', async () => {
      const caja = await service.crear('Caja', TipoCuentaDinero.CAJA, false, false);
      await service.registrarMovimientoCapital(caja.id, TipoMovimientoCapital.ENTRADA, 100);

      const ajuste = await service.crearAjusteArqueo(caja.id, 115);

      expect(ajuste.diferencia.equals(15)).toBe(true);
      expect((await accountingService.saldoPorCuenta(caja.id)).equals(115)).toBe(true);
      const sobra = await accountingService.obtenerCuentaPorCodigo('778001');
      expect((await accountingService.saldoPorCuenta(sobra.id)).equals(15)).toBe(true);
    });

    it('crearAjusteArqueo con falta: debita 668001 y baja el saldo de la caja', async () => {
      const caja = await service.crear('Caja', TipoCuentaDinero.CAJA, false, false);
      await service.registrarMovimientoCapital(caja.id, TipoMovimientoCapital.ENTRADA, 100);

      const ajuste = await service.crearAjusteArqueo(caja.id, 90);

      expect(ajuste.diferencia.equals(-10)).toBe(true);
      expect((await accountingService.saldoPorCuenta(caja.id)).equals(90)).toBe(true);
      const falta = await accountingService.obtenerCuentaPorCodigo('668001');
      expect((await accountingService.saldoPorCuenta(falta.id)).equals(10)).toBe(true);
    });

    it('crearAjusteArqueo con diferencia exacta 0 no postea ningún asiento', async () => {
      const caja = await service.crear('Caja', TipoCuentaDinero.CAJA, false, false);
      await service.registrarMovimientoCapital(caja.id, TipoMovimientoCapital.ENTRADA, 100);

      const ajuste = await service.crearAjusteArqueo(caja.id, 100);

      expect(ajuste.diferencia.equals(0)).toBe(true);
      expect(ajuste.journalEntryId).toBeUndefined();
      expect((await accountingService.saldoPorCuenta(caja.id)).equals(100)).toBe(true);
    });

    it('rechaza ajuste de arqueo sobre una cuenta que no es tipo Caja', async () => {
      const banco = await service.crear('Banco', TipoCuentaDinero.BANCO, false, false);
      await expect(service.crearAjusteArqueo(banco.id, 50)).rejects.toThrow(/tipo Caja/i);
    });

    it('actualizarAjusteArqueo revierte el ajuste anterior y recalcula contra el teórico actual', async () => {
      const caja = await service.crear('Caja', TipoCuentaDinero.CAJA, false, false);
      await service.registrarMovimientoCapital(caja.id, TipoMovimientoCapital.ENTRADA, 100);
      const ajuste = await service.crearAjusteArqueo(caja.id, 90); // falta de 10, saldo queda en 90

      const actualizado = await service.actualizarAjusteArqueo(ajuste.id, 95);

      // Tras revertir el ajuste anterior el teórico vuelve a 100; el nuevo real es 95 -> falta de 5.
      expect(actualizado.importeTeorico.equals(100)).toBe(true);
      expect(actualizado.diferencia.equals(-5)).toBe(true);
      expect((await accountingService.saldoPorCuenta(caja.id)).equals(95)).toBe(true);
    });

    it('eliminarAjusteArqueo revierte el asiento y deja el saldo como si no hubiera pasado', async () => {
      const caja = await service.crear('Caja', TipoCuentaDinero.CAJA, false, false);
      await service.registrarMovimientoCapital(caja.id, TipoMovimientoCapital.ENTRADA, 100);
      const ajuste = await service.crearAjusteArqueo(caja.id, 90);

      await service.eliminarAjusteArqueo(ajuste.id);

      expect((await accountingService.saldoPorCuenta(caja.id)).equals(100)).toBe(true);
    });
  });

  it('movimientos() marca origenTipo=null para asientos que vienen de otros módulos', async () => {
    const caja = await service.crear('Caja', TipoCuentaDinero.CAJA, false, false);
    const ingresos = await accountingService.crearCuenta({
      nombre: 'Ingresos bar',
      code: '701001',
      type: AccountType.INCOME,
      esCuentaDeDinero: false,
    });
    await accountingService.post(
      new JournalEntry({
        id: randomUUID(),
        date: new Date(),
        description: 'Venta de bar (1 producto/s)',
        lines: [
          new JournalLine({ account: (await accountingService.obtenerCuentaPorId(caja.id)), debit: new Decimal(20) }),
          new JournalLine({ account: ingresos, credit: new Decimal(20) }),
        ],
      }),
    );

    const movimientos = await service.movimientos(caja.id);
    expect(movimientos).toHaveLength(1);
    expect(movimientos[0].origenTipo).toBeNull();
    expect(movimientos[0].origenId).toBeNull();
  });
});
