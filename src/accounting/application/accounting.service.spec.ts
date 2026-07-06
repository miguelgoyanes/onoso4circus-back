import Decimal from 'decimal.js';
import { Account, AccountType } from '../domain/account';
import { JournalEntry } from '../domain/journal-entry';
import { JournalLine } from '../domain/journal-line';
import { InMemoryJournalEntryRepository } from '../infrastructure/in-memory-journal-entry.repository';
import { AccountingService } from './accounting.service';

describe('AccountingService', () => {
  const cajaTaquilla = new Account('1', 'Caja — Taquilla', AccountType.ASSET, '570002');
  const ingresosTaquilla = new Account('2', 'Ingresos taquilla', AccountType.INCOME, '700001');

  let service: AccountingService;

  beforeEach(() => {
    service = new AccountingService(new InMemoryJournalEntryRepository());
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
});
