import Decimal from 'decimal.js';
import { AccountingService } from '../../accounting/application/accounting.service';
import { AccountType } from '../../accounting/domain/account';
import { InMemoryJournalEntryRepository } from '../../accounting/infrastructure/in-memory-journal-entry.repository';
import { InMemoryAccountRepository } from '../../accounting/infrastructure/in-memory-account.repository';
import { Activo } from '../domain/activo';
import { InMemoryActivoRepository } from '../infrastructure/in-memory-activo.repository';
import { InMemoryCategoriaActivoRepository } from '../infrastructure/in-memory-categoria-activo.repository';
import { CategoriaActivoService } from './categoria-activo.service';

describe('CategoriaActivoService', () => {
  let accountingService: AccountingService;
  let activoRepo: InMemoryActivoRepository;
  let service: CategoriaActivoService;

  beforeEach(() => {
    accountingService = new AccountingService(new InMemoryJournalEntryRepository(), new InMemoryAccountRepository());
    activoRepo = new InMemoryActivoRepository();
    service = new CategoriaActivoService(new InMemoryCategoriaActivoRepository(), activoRepo, accountingService);
  });

  async function marcarComoUsada(categoriaId: string) {
    await activoRepo.save(
      new Activo({
        id: 'a1',
        categoriaId,
        nombre: 'Activo de prueba',
        fechaCompra: new Date('2026-01-01'),
        coste: new Decimal(1000),
        cuentaPagoId: 'cuenta-pago',
        vidaUtilAnios: 5,
        valorResidual: new Decimal(0),
        activo: true,
        amortizacionAcumulada: new Decimal(0),
        journalEntryCompraId: 'je1',
      }),
    );
  }

  it('crea una categoría nueva creando su cuenta contable ASSET', async () => {
    const categoria = await service.crear('Drones', '210008', true);
    expect(categoria.esPredefinida).toBe(false);
    const cuenta = await accountingService.obtenerCuentaPorCodigo('210008');
    expect(categoria.cuentaContableId).toBe(cuenta.id);
  });

  it('en una categoría no predefinida y no usada, permite editar nombre/IVA/cuenta', async () => {
    const categoria = await service.crear('Drones', '210008', false);
    const actualizada = await service.actualizar(categoria.id, 'Drones de espectáculo', true, '210009');
    expect(actualizada.nombre).toBe('Drones de espectáculo');
    expect(actualizada.aplicaIva).toBe(true);
    const cuenta = await accountingService.obtenerCuentaPorCodigo('210009');
    expect(actualizada.cuentaContableId).toBe(cuenta.id);
  });

  it('en una categoría no predefinida ya usada, permite nombre/IVA pero bloquea la cuenta', async () => {
    const categoria = await service.crear('Drones', '210008', false);
    await marcarComoUsada(categoria.id);

    const actualizada = await service.actualizar(categoria.id, 'Drones de espectáculo', true);
    expect(actualizada.nombre).toBe('Drones de espectáculo');

    await expect(service.actualizar(categoria.id, 'Drones', true, '210009')).rejects.toThrow(/ya usada/i);
  });

  it('en una categoría predefinida, solo se puede editar el nombre', async () => {
    const cuenta = await accountingService.crearCuenta({
      nombre: 'Carpa y estructura',
      code: '210001',
      type: AccountType.ASSET,
      esCuentaDeDinero: false,
    });
    await service.sembrarPredefinidaSiNoExiste({ nombre: 'Carpa y estructura', cuentaContableId: cuenta.id, aplicaIva: true });
    const predefinidas = await service.listarConUso();
    const categoria = predefinidas.find((c) => c.categoria.nombre === 'Carpa y estructura')!.categoria;

    const renombrada = await service.actualizar(categoria.id, 'Carpa principal', categoria.aplicaIva);
    expect(renombrada.nombre).toBe('Carpa principal');

    await expect(service.actualizar(categoria.id, 'Carpa principal', categoria.aplicaIva, '210099')).rejects.toThrow(
      /predefinida/i,
    );
  });

  it('elimina una categoría sin activos vinculados', async () => {
    const categoria = await service.crear('Drones', '210008', false);
    await service.eliminar(categoria.id);
    await expect(service.obtener(categoria.id)).rejects.toThrow(/no encontrada/i);
  });

  it('rechaza eliminar una categoría con activos vinculados', async () => {
    const categoria = await service.crear('Drones', '210008', false);
    await marcarComoUsada(categoria.id);
    await expect(service.eliminar(categoria.id)).rejects.toThrow(/vinculados/i);
  });

  it('sembrarPredefinidaSiNoExiste es idempotente', async () => {
    const cuenta = await accountingService.crearCuenta({
      nombre: 'Mobiliario y sillas',
      code: '210002',
      type: AccountType.ASSET,
      esCuentaDeDinero: false,
    });
    await service.sembrarPredefinidaSiNoExiste({ nombre: 'Mobiliario y sillas', cuentaContableId: cuenta.id, aplicaIva: true });
    await service.sembrarPredefinidaSiNoExiste({ nombre: 'Mobiliario y sillas', cuentaContableId: cuenta.id, aplicaIva: true });

    const todas = await service.listarConUso();
    expect(todas.filter((c) => c.categoria.nombre === 'Mobiliario y sillas')).toHaveLength(1);
  });
});
