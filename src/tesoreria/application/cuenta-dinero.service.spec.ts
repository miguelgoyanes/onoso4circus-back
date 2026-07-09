import { AccountingService } from '../../accounting/application/accounting.service';
import { InMemoryJournalEntryRepository } from '../../accounting/infrastructure/in-memory-journal-entry.repository';
import { InMemoryAccountRepository } from '../../accounting/infrastructure/in-memory-account.repository';
import { AccountType, TipoCuentaDinero } from '../../accounting/domain/account';
import { TipoMovimientoCapital } from '../domain/tipo-movimiento-capital';
import { CuentaDineroService } from './cuenta-dinero.service';

describe('CuentaDineroService', () => {
  let accountingService: AccountingService;
  let accountRepository: InMemoryAccountRepository;
  let service: CuentaDineroService;

  beforeEach(async () => {
    accountRepository = new InMemoryAccountRepository();
    accountingService = new AccountingService(new InMemoryJournalEntryRepository(), accountRepository);
    service = new CuentaDineroService(accountingService, accountRepository);

    await accountingService.crearCuenta({
      nombre: 'Capital',
      code: '100',
      type: AccountType.EQUITY,
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

  it('transferir mueve saldo de una cuenta a otra sin alterar el total', async () => {
    const origen = await service.crear('Caja', TipoCuentaDinero.CAJA, false, false);
    const destino = await service.crear('Banco', TipoCuentaDinero.BANCO, false, false);
    await service.registrarMovimientoCapital(origen.id, TipoMovimientoCapital.ENTRADA, 100);

    await service.transferir(origen.id, destino.id, 30, 'nota');

    expect((await accountingService.saldoPorCuenta(origen.id)).equals(70)).toBe(true);
    expect((await accountingService.saldoPorCuenta(destino.id)).equals(30)).toBe(true);
  });

  it('rechaza transferir entre la misma cuenta', async () => {
    const cuenta = await service.crear('Caja', TipoCuentaDinero.CAJA, false, false);
    await expect(service.transferir(cuenta.id, cuenta.id, 10)).rejects.toThrow(/misma/i);
  });

  it('registrarMovimientoCapital: ENTRADA suma, SALIDA resta, usando la cuenta 100 por debajo', async () => {
    const cuenta = await service.crear('Caja', TipoCuentaDinero.CAJA, false, false);

    await service.registrarMovimientoCapital(cuenta.id, TipoMovimientoCapital.ENTRADA, 200);
    expect((await accountingService.saldoPorCuenta(cuenta.id)).equals(200)).toBe(true);

    await service.registrarMovimientoCapital(cuenta.id, TipoMovimientoCapital.SALIDA, 80, 'retirada personal');
    expect((await accountingService.saldoPorCuenta(cuenta.id)).equals(120)).toBe(true);

    // Capital es EQUITY: aumenta con el crédito (ENTRADA) y baja con el débito (SALIDA) —
    // 200 de entrada - 80 de salida = 120, positivo (capital aportado neto).
    const capital = await accountingService.obtenerCuentaPorCodigo('100');
    expect((await accountingService.saldoPorCuenta(capital.id)).equals(120)).toBe(true);
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
});
