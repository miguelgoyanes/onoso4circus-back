import Decimal from 'decimal.js';
import { Account, AccountType } from '../domain/account';
import { JournalEntry } from '../domain/journal-entry';
import { JournalLine } from '../domain/journal-line';
import { InMemoryJournalEntryRepository } from '../infrastructure/in-memory-journal-entry.repository';
import { InMemoryAccountRepository } from '../infrastructure/in-memory-account.repository';
import { AccountingService } from './accounting.service';

describe('AccountingService', () => {
  const cajaTaquilla = new Account('1', 'Caja — Taquilla', AccountType.ASSET, '570002');
  const ingresosTaquilla = new Account('2', 'Ingresos taquilla', AccountType.INCOME, '700001');

  let service: AccountingService;

  beforeEach(() => {
    service = new AccountingService(
      new InMemoryJournalEntryRepository(),
      new InMemoryAccountRepository(),
    );
  });

  it('guarda un asiento balanceado', async () => {
    const entry = new JournalEntry({
      id: 'e1',
      date: new Date('2026-07-06'),
      description: 'Venta de entradas',
      lines: [
        new JournalLine({
          account: cajaTaquilla,
          debit: new Decimal(50),
          dimensions: { plazaId: 'plaza-1', fechaId: 'fecha-1', paseId: 'pase-1' },
        }),
        new JournalLine({
          account: ingresosTaquilla,
          credit: new Decimal(50),
          dimensions: { plazaId: 'plaza-1', fechaId: 'fecha-1', paseId: 'pase-1' },
        }),
      ],
    });

    await expect(service.post(entry)).resolves.not.toThrow();
  });

  it('rechaza guardar un asiento desbalanceado', async () => {
    const entry = new JournalEntry({
      id: 'e2',
      date: new Date('2026-07-06'),
      description: 'Asiento roto',
      lines: [
        new JournalLine({ account: cajaTaquilla, debit: new Decimal(50) }),
        new JournalLine({ account: ingresosTaquilla, credit: new Decimal(40) }),
      ],
    });

    await expect(service.post(entry)).rejects.toThrow(/desbalanceado/);
  });

  it('filtra líneas por plaza_id a través de entriesByDimension', async () => {
    const entryPlaza1 = new JournalEntry({
      id: 'e3',
      date: new Date('2026-07-06'),
      description: 'Venta plaza 1',
      lines: [
        new JournalLine({ account: cajaTaquilla, debit: new Decimal(30), dimensions: { plazaId: 'plaza-1' } }),
        new JournalLine({ account: ingresosTaquilla, credit: new Decimal(30), dimensions: { plazaId: 'plaza-1' } }),
      ],
    });
    const entryPlaza2 = new JournalEntry({
      id: 'e4',
      date: new Date('2026-07-06'),
      description: 'Venta plaza 2',
      lines: [
        new JournalLine({ account: cajaTaquilla, debit: new Decimal(20), dimensions: { plazaId: 'plaza-2' } }),
        new JournalLine({ account: ingresosTaquilla, credit: new Decimal(20), dimensions: { plazaId: 'plaza-2' } }),
      ],
    });

    await service.post(entryPlaza1);
    await service.post(entryPlaza2);

    const lines = await service.entriesByDimension({ plazaId: 'plaza-1' });

    expect(lines).toHaveLength(2);
    expect(lines.every((l) => l.dimensions.plazaId === 'plaza-1')).toBe(true);
  });

  describe('gestión de cuentas (Tesorería)', () => {
    it('crea una cuenta nueva', async () => {
      const cuenta = await service.crearCuenta({
        nombre: 'Banco',
        code: '572001',
        type: AccountType.ASSET,
        esCuentaDeDinero: true,
      });

      expect(cuenta.code).toBe('572001');
      expect(cuenta.esCuentaDeDinero).toBe(true);
    });

    it('rechaza crear una cuenta con un código ya existente', async () => {
      await service.crearCuenta({
        nombre: 'Banco',
        code: '572001',
        type: AccountType.ASSET,
        esCuentaDeDinero: true,
      });

      await expect(
        service.crearCuenta({
          nombre: 'Banco duplicado',
          code: '572001',
          type: AccountType.ASSET,
          esCuentaDeDinero: true,
        }),
      ).rejects.toThrow(/ya existe/i);
    });

    it('calcula el saldo de una cuenta ASSET como débito menos crédito', async () => {
      const caja = await service.crearCuenta({
        nombre: 'Caja — Taquilla',
        code: '570002',
        type: AccountType.ASSET,
        esCuentaDeDinero: true,
      });
      const ingresos = await service.crearCuenta({
        nombre: 'Ingresos taquilla',
        code: '700001',
        type: AccountType.INCOME,
        esCuentaDeDinero: false,
      });

      await service.post(
        new JournalEntry({
          id: 'e5',
          date: new Date('2026-07-06'),
          description: 'Venta de entradas',
          lines: [
            new JournalLine({ account: caja, debit: new Decimal(100) }),
            new JournalLine({ account: ingresos, credit: new Decimal(100) }),
          ],
        }),
      );

      const saldoCaja = await service.saldoPorCuenta(caja.id);
      const saldoIngresos = await service.saldoPorCuenta(ingresos.id);

      expect(saldoCaja.equals(new Decimal(100))).toBe(true);
      expect(saldoIngresos.equals(new Decimal(100))).toBe(true);
    });

    it('el patrimonio líquido total solo suma cuentas marcadas como dinero', async () => {
      const caja = await service.crearCuenta({
        nombre: 'Caja — Taquilla',
        code: '570002',
        type: AccountType.ASSET,
        esCuentaDeDinero: true,
      });
      const stock = await service.crearCuenta({
        nombre: 'Stock bar',
        code: '300001',
        type: AccountType.ASSET,
        esCuentaDeDinero: false,
      });
      const ingresos = await service.crearCuenta({
        nombre: 'Ingresos taquilla',
        code: '700001',
        type: AccountType.INCOME,
        esCuentaDeDinero: false,
      });

      await service.post(
        new JournalEntry({
          id: 'e6',
          date: new Date('2026-07-06'),
          description: 'Venta de entradas',
          lines: [
            new JournalLine({ account: caja, debit: new Decimal(60) }),
            new JournalLine({ account: ingresos, credit: new Decimal(60) }),
          ],
        }),
      );
      await service.post(
        new JournalEntry({
          id: 'e7',
          date: new Date('2026-07-06'),
          description: 'Recepción de stock',
          lines: [
            new JournalLine({ account: stock, debit: new Decimal(40) }),
            new JournalLine({ account: caja, credit: new Decimal(40) }),
          ],
        }),
      );

      const patrimonio = await service.patrimonioLiquidoTotal();

      expect(patrimonio.equals(new Decimal(20))).toBe(true);
    });
  });
});
