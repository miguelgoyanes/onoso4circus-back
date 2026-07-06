import Decimal from 'decimal.js';
import { Account, AccountType } from './account';
import { JournalEntry } from './journal-entry';
import { JournalLine } from './journal-line';

describe('JournalEntry', () => {
  const caja = new Account('1', 'Efectivo en tesorería general', AccountType.ASSET, '570001');
  const ingresosTaquilla = new Account('2', 'Ingresos taquilla', AccountType.INCOME, '700001');

  it('acepta un asiento balanceado (débito == crédito)', () => {
    const entry = new JournalEntry({
      id: 'e1',
      date: new Date('2026-07-06'),
      description: 'Venta de entradas en efectivo',
      lines: [
        new JournalLine({ account: caja, debit: new Decimal(100) }),
        new JournalLine({ account: ingresosTaquilla, credit: new Decimal(100) }),
      ],
    });

    expect(entry.isBalanced()).toBe(true);
    expect(() => entry.validateBalance()).not.toThrow();
    expect(entry.totalDebit().equals(new Decimal(100))).toBe(true);
    expect(entry.totalCredit().equals(new Decimal(100))).toBe(true);
  });

  it('rechaza un asiento desbalanceado', () => {
    const entry = new JournalEntry({
      id: 'e2',
      date: new Date('2026-07-06'),
      description: 'Asiento mal cuadrado',
      lines: [
        new JournalLine({ account: caja, debit: new Decimal(100) }),
        new JournalLine({ account: ingresosTaquilla, credit: new Decimal(90) }),
      ],
    });

    expect(entry.isBalanced()).toBe(false);
    expect(() => entry.validateBalance()).toThrow(/desbalanceado/);
  });

  it('balancea correctamente con importes decimales sin errores de coma flotante', () => {
    // 0.1 + 0.2 !== 0.3 en float — este caso debe cuadrar exacto usando Decimal
    const entry = new JournalEntry({
      id: 'e3',
      date: new Date('2026-07-06'),
      description: 'Múltiples líneas decimales',
      lines: [
        new JournalLine({ account: caja, debit: new Decimal('0.1') }),
        new JournalLine({ account: caja, debit: new Decimal('0.2') }),
        new JournalLine({ account: ingresosTaquilla, credit: new Decimal('0.3') }),
      ],
    });

    expect(entry.isBalanced()).toBe(true);
  });

  it('requiere al menos 2 líneas', () => {
    expect(
      () =>
        new JournalEntry({
          id: 'e4',
          date: new Date('2026-07-06'),
          description: 'Asiento con una sola línea',
          lines: [new JournalLine({ account: caja, debit: new Decimal(50) })],
        }),
    ).toThrow(/al menos 2 líneas/);
  });

  it('una línea no puede tener debit y credit a la vez', () => {
    expect(
      () =>
        new JournalLine({
          account: caja,
          debit: new Decimal(10),
          credit: new Decimal(10),
        }),
    ).toThrow(/no puede tener debit y credit a la vez/);
  });

  it('una línea no puede tener debit y credit ambos en cero', () => {
    expect(() => new JournalLine({ account: caja })).toThrow(
      /debit o credit distinto de cero/,
    );
  });
});
