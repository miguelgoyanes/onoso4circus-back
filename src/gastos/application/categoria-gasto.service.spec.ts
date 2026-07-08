import Decimal from 'decimal.js';
import { AccountingService } from '../../accounting/application/accounting.service';
import { AccountType } from '../../accounting/domain/account';
import { InMemoryJournalEntryRepository } from '../../accounting/infrastructure/in-memory-journal-entry.repository';
import { InMemoryAccountRepository } from '../../accounting/infrastructure/in-memory-account.repository';
import { EstadoPagoGasto, Gasto } from '../domain/gasto';
import { InMemoryGastoRepository } from '../infrastructure/in-memory-gasto.repository';
import { InMemoryCategoriaGastoRepository } from '../infrastructure/in-memory-categoria-gasto.repository';
import { CategoriaGastoService } from './categoria-gasto.service';

describe('CategoriaGastoService', () => {
  let accountingService: AccountingService;
  let gastoRepo: InMemoryGastoRepository;
  let service: CategoriaGastoService;

  beforeEach(() => {
    accountingService = new AccountingService(new InMemoryJournalEntryRepository(), new InMemoryAccountRepository());
    gastoRepo = new InMemoryGastoRepository();
    service = new CategoriaGastoService(new InMemoryCategoriaGastoRepository(), gastoRepo, accountingService);
  });

  async function marcarComoUsada(categoriaId: string) {
    await gastoRepo.save(
      new Gasto({
        id: 'g1',
        categoriaId,
        fecha: new Date('2026-07-10'),
        descripcion: 'gasto de prueba',
        importe: new Decimal(10),
        estadoPago: EstadoPagoGasto.PAGADO,
      }),
    );
  }

  it('crea una categoría nueva creando su cuenta contable EXPENSE', async () => {
    const categoria = await service.crear('Combustible', '629006', false, true);
    expect(categoria.esPredefinida).toBe(false);
    expect(categoria.esPagoPersonal).toBe(false);
    const cuenta = await accountingService.obtenerCuentaPorCodigo('629006');
    expect(categoria.cuentaContableId).toBe(cuenta.id);
  });

  it('rechaza crear dos categorías con el mismo código de cuenta', async () => {
    await service.crear('Combustible', '629006', false, true);
    await expect(service.crear('Otra', '629006', false, true)).rejects.toThrow(/ya existe una cuenta/i);
  });

  it('en una categoría no predefinida y no usada, permite editar nombre/IVA/empleado/cuenta', async () => {
    const categoria = await service.crear('Combustible', '629006', false, false);
    const actualizada = await service.actualizar(categoria.id, 'Gasolina', true, true, '629007');
    expect(actualizada.nombre).toBe('Gasolina');
    expect(actualizada.aplicaIva).toBe(true);
    expect(actualizada.requiereEmpleado).toBe(true);
    const cuenta = await accountingService.obtenerCuentaPorCodigo('629007');
    expect(actualizada.cuentaContableId).toBe(cuenta.id);
  });

  it('en una categoría no predefinida ya usada, permite nombre/IVA/empleado pero bloquea la cuenta', async () => {
    const categoria = await service.crear('Combustible', '629006', false, false);
    await marcarComoUsada(categoria.id);

    const actualizada = await service.actualizar(categoria.id, 'Gasolina', true, true);
    expect(actualizada.nombre).toBe('Gasolina');
    expect(actualizada.aplicaIva).toBe(true);

    await expect(service.actualizar(categoria.id, 'Gasolina', true, true, '629008')).rejects.toThrow(
      /ya usada/i,
    );
  });

  it('en una categoría predefinida, solo se puede editar el nombre', async () => {
    await service.sembrarPredefinidaSiNoExiste({
      nombre: 'Montaje',
      cuentaContableId: (
        await accountingService.crearCuenta({
          nombre: 'Montaje',
          code: '620001',
          type: AccountType.EXPENSE,
          esCuentaDeDinero: false,
        })
      ).id,
      requiereEmpleado: false,
      esPagoPersonal: false,
      aplicaIva: true,
    });
    const predefinidas = await service.listarConUso();
    const categoria = predefinidas.find((c) => c.categoria.nombre === 'Montaje')!.categoria;

    const renombrada = await service.actualizar(categoria.id, 'Montaje de carpa', categoria.aplicaIva, categoria.requiereEmpleado);
    expect(renombrada.nombre).toBe('Montaje de carpa');

    await expect(
      service.actualizar(categoria.id, 'Montaje de carpa', categoria.aplicaIva, categoria.requiereEmpleado, '629009'),
    ).rejects.toThrow(/predefinida/i);
  });

  it('elimina una categoría sin gastos vinculados', async () => {
    const categoria = await service.crear('Combustible', '629006', false, false);
    await service.eliminar(categoria.id);
    await expect(service.obtener(categoria.id)).rejects.toThrow(/no encontrada/i);
  });

  it('rechaza eliminar una categoría con gastos vinculados', async () => {
    const categoria = await service.crear('Combustible', '629006', false, false);
    await marcarComoUsada(categoria.id);
    await expect(service.eliminar(categoria.id)).rejects.toThrow(/vinculados/i);
  });

  it('listarConUso refleja correctamente qué categorías están usadas', async () => {
    const usada = await service.crear('Usada', '629006', false, false);
    const libre = await service.crear('Libre', '629007', false, false);
    await marcarComoUsada(usada.id);

    const todas = await service.listarConUso();
    expect(todas.find((c) => c.categoria.id === usada.id)?.usada).toBe(true);
    expect(todas.find((c) => c.categoria.id === libre.id)?.usada).toBe(false);
  });

  it('sembrarPredefinidaSiNoExiste es idempotente', async () => {
    await service.sembrarPredefinidaSiNoExiste({
      nombre: 'Personal: Pago a empleado',
      cuentaContableId: null,
      requiereEmpleado: true,
      esPagoPersonal: true,
      aplicaIva: false,
    });
    await service.sembrarPredefinidaSiNoExiste({
      nombre: 'Personal: Pago a empleado',
      cuentaContableId: null,
      requiereEmpleado: true,
      esPagoPersonal: true,
      aplicaIva: false,
    });

    const todas = await service.listarConUso();
    expect(todas.filter((c) => c.categoria.nombre === 'Personal: Pago a empleado')).toHaveLength(1);
  });
});
