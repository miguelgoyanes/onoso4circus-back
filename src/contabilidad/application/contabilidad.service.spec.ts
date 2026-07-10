import Decimal from 'decimal.js';
import { AccountingService } from '../../accounting/application/accounting.service';
import { Account, AccountType } from '../../accounting/domain/account';
import { JournalEntry } from '../../accounting/domain/journal-entry';
import { JournalLine } from '../../accounting/domain/journal-line';
import { InMemoryJournalEntryRepository } from '../../accounting/infrastructure/in-memory-journal-entry.repository';
import { InMemoryAccountRepository } from '../../accounting/infrastructure/in-memory-account.repository';
import { ContabilidadService } from './contabilidad.service';

describe('ContabilidadService', () => {
  const caja = new Account('caja', 'Caja', AccountType.ASSET, '570001', true);
  const banco = new Account('banco', 'Banco', AccountType.ASSET, '572001', true);
  const ingresos = new Account('ingresos', 'Ingresos taquilla', AccountType.INCOME, '700001');
  const gastos = new Account('gastos', 'Gestoría', AccountType.EXPENSE, '622001');
  const capital = new Account('capital', 'Capital social', AccountType.EQUITY, '100001');

  let accountingService: AccountingService;
  let service: ContabilidadService;

  beforeEach(async () => {
    const accountRepository = new InMemoryAccountRepository();
    for (const cuenta of [caja, banco, ingresos, gastos, capital]) {
      await accountRepository.save(cuenta);
    }
    accountingService = new AccountingService(new InMemoryJournalEntryRepository(), accountRepository);
    service = new ContabilidadService(accountingService);
  });

  it('libroDiario devuelve los asientos completos (todas sus líneas) filtrados por cuenta y fecha', async () => {
    await accountingService.post(
      new JournalEntry({
        id: 'e1',
        date: new Date('2026-01-10'),
        description: 'Venta taquilla',
        lines: [
          new JournalLine({ account: caja, debit: new Decimal(100) }),
          new JournalLine({ account: ingresos, credit: new Decimal(100) }),
        ],
      }),
    );
    await accountingService.post(
      new JournalEntry({
        id: 'e2',
        date: new Date('2026-02-10'),
        description: 'Gestoría',
        lines: [
          new JournalLine({ account: gastos, debit: new Decimal(30) }),
          new JournalLine({ account: banco, credit: new Decimal(30) }),
        ],
      }),
    );

    const diario = await service.libroDiario({
      accountIds: [caja.id],
      fechaDesde: new Date('2026-01-01'),
      fechaHasta: new Date('2026-01-31'),
    });

    expect(diario).toHaveLength(1);
    expect(diario[0].id).toBe('e1');
    expect(diario[0].lineas).toHaveLength(2);
    expect(diario[0].lineas.some((l) => l.cuenta.id === ingresos.id)).toBe(true);
  });

  it('libroMayor calcula saldo inicial (movimientos anteriores al rango) y saldo acumulado dentro del rango', async () => {
    await accountingService.post(
      new JournalEntry({
        id: 'e1',
        date: new Date('2026-01-05'),
        description: 'Venta enero',
        lines: [
          new JournalLine({ account: caja, debit: new Decimal(100) }),
          new JournalLine({ account: ingresos, credit: new Decimal(100) }),
        ],
      }),
    );
    await accountingService.post(
      new JournalEntry({
        id: 'e2',
        date: new Date('2026-02-05'),
        description: 'Venta febrero',
        lines: [
          new JournalLine({ account: caja, debit: new Decimal(50) }),
          new JournalLine({ account: ingresos, credit: new Decimal(50) }),
        ],
      }),
    );
    await accountingService.post(
      new JournalEntry({
        id: 'e3',
        date: new Date('2026-02-20'),
        description: 'Compra material',
        lines: [
          new JournalLine({ account: gastos, debit: new Decimal(20) }),
          new JournalLine({ account: caja, credit: new Decimal(20) }),
        ],
      }),
    );

    const mayor = await service.libroMayor(caja.id, new Date('2026-02-01'), new Date('2026-02-28'));

    expect(mayor.saldoInicial.equals(100)).toBe(true);
    expect(mayor.movimientos).toHaveLength(2);
    expect(mayor.movimientos[0].saldo.equals(150)).toBe(true);
    expect(mayor.movimientos[1].saldo.equals(130)).toBe(true);
    expect(mayor.saldoFinal.equals(130)).toBe(true);
  });

  it('pyg desglosa ingresos y gastos por cuenta real y calcula el resultado', async () => {
    await accountingService.post(
      new JournalEntry({
        id: 'e1',
        date: new Date('2026-03-10'),
        description: 'Venta',
        lines: [
          new JournalLine({ account: caja, debit: new Decimal(200) }),
          new JournalLine({ account: ingresos, credit: new Decimal(200) }),
        ],
      }),
    );
    await accountingService.post(
      new JournalEntry({
        id: 'e2',
        date: new Date('2026-03-15'),
        description: 'Gestoría',
        lines: [
          new JournalLine({ account: gastos, debit: new Decimal(80) }),
          new JournalLine({ account: caja, credit: new Decimal(80) }),
        ],
      }),
    );

    const pyg = await service.pyg(new Date('2026-03-01'), new Date('2026-03-31'));

    expect(pyg.totalIngresos.equals(200)).toBe(true);
    expect(pyg.totalGastos.equals(80)).toBe(true);
    expect(pyg.resultado.equals(120)).toBe(true);
    expect(pyg.ingresos[0].cuenta.code).toBe('700001');
    expect(pyg.gastos[0].cuenta.code).toBe('622001');
  });

  it('balance siempre cuadra: Activo = Pasivo + Patrimonio Neto (incl. resultado calculado al vuelo)', async () => {
    await accountingService.post(
      new JournalEntry({
        id: 'e1',
        date: new Date('2026-04-01'),
        description: 'Aportación de capital',
        lines: [
          new JournalLine({ account: banco, debit: new Decimal(1000) }),
          new JournalLine({ account: capital, credit: new Decimal(1000) }),
        ],
      }),
    );
    await accountingService.post(
      new JournalEntry({
        id: 'e2',
        date: new Date('2026-04-10'),
        description: 'Venta taquilla',
        lines: [
          new JournalLine({ account: caja, debit: new Decimal(300) }),
          new JournalLine({ account: ingresos, credit: new Decimal(300) }),
        ],
      }),
    );
    await accountingService.post(
      new JournalEntry({
        id: 'e3',
        date: new Date('2026-04-15'),
        description: 'Gestoría',
        lines: [
          new JournalLine({ account: gastos, debit: new Decimal(50) }),
          new JournalLine({ account: banco, credit: new Decimal(50) }),
        ],
      }),
    );

    const balance = await service.balance(new Date('2026-04-30'));

    expect(balance.totalActivo.equals(1250)).toBe(true); // banco (1000-50) + caja (300)
    expect(balance.totalActivo.equals(balance.totalPasivo.plus(balance.totalPatrimonioNeto))).toBe(true);

    const resultado = balance.patrimonioNeto.find((l) => l.cuenta.code === '129')!;
    expect(resultado.saldo.equals(250)).toBe(true); // 300 ingresos - 50 gastos
  });
});
