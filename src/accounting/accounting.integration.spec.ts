import Decimal from 'decimal.js';
import { randomUUID } from 'crypto';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountingModule } from './accounting.module';
import { AccountingService } from './application/accounting.service';
import { Account, AccountType } from './domain/account';
import { JournalEntry } from './domain/journal-entry';
import { JournalLine } from './domain/journal-line';
import { AccountOrmEntity } from './infrastructure/orm/account.orm-entity';

describe('AccountingService (integración contra Postgres real)', () => {
  let service: AccountingService;
  let accountRepo: Repository<AccountOrmEntity>;
  let moduleRef: import('@nestjs/testing').TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            type: 'postgres',
            host: config.get<string>('DB_HOST'),
            port: parseInt(config.get<string>('DB_PORT', '5432'), 10),
            username: config.get<string>('DB_USER'),
            password: config.get<string>('DB_PASSWORD'),
            database: config.get<string>('DB_NAME'),
            autoLoadEntities: true,
            synchronize: true,
          }),
        }),
        AccountingModule,
      ],
    }).compile();

    service = moduleRef.get(AccountingService);
    accountRepo = moduleRef.get(getRepositoryToken(AccountOrmEntity));
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  async function createAccount(
    code: string,
    name: string,
    type: AccountType,
  ): Promise<Account> {
    const ormAccount = accountRepo.create({ id: randomUUID(), code, name, type });
    const saved = await accountRepo.save(ormAccount);
    return new Account(saved.id, saved.name, saved.type, saved.code);
  }

  it('persiste un asiento balanceado y lo recupera filtrando por plaza_id', async () => {
    const testId = randomUUID().slice(0, 8);
    const cajaTaquilla = await createAccount(
      `570002-${testId}`,
      'Caja — Taquilla',
      AccountType.ASSET,
    );
    const ingresosTaquilla = await createAccount(
      `700001-${testId}`,
      'Ingresos taquilla',
      AccountType.INCOME,
    );

    const entry = new JournalEntry({
      id: randomUUID(),
      date: new Date('2026-07-06'),
      description: 'Venta de entradas en efectivo (test integración)',
      lines: [
        new JournalLine({
          account: cajaTaquilla,
          debit: new Decimal(75),
          dimensions: { plazaId: `plaza-integracion-${testId}` },
        }),
        new JournalLine({
          account: ingresosTaquilla,
          credit: new Decimal(75),
          dimensions: { plazaId: `plaza-integracion-${testId}` },
        }),
      ],
    });

    await service.post(entry);

    const lines = await service.entriesByDimension({
      plazaId: `plaza-integracion-${testId}`,
    });

    expect(lines).toHaveLength(2);
    const debitLine = lines.find((l) => !l.debit.isZero());
    const creditLine = lines.find((l) => !l.credit.isZero());
    expect(debitLine?.debit.equals(new Decimal(75))).toBe(true);
    expect(creditLine?.credit.equals(new Decimal(75))).toBe(true);
    expect(debitLine?.account.code).toBe(`570002-${testId}`);
  });

  it('rechaza persistir un asiento desbalanceado', async () => {
    const testId = randomUUID().slice(0, 8);
    const caja = await createAccount(`570003-${testId}`, 'Caja — Bar', AccountType.ASSET);
    const ingresos = await createAccount(
      `701001-${testId}`,
      'Ingresos bar',
      AccountType.INCOME,
    );

    const entry = new JournalEntry({
      id: randomUUID(),
      date: new Date('2026-07-06'),
      description: 'Asiento roto (test integración)',
      lines: [
        new JournalLine({ account: caja, debit: new Decimal(20) }),
        new JournalLine({ account: ingresos, credit: new Decimal(10) }),
      ],
    });

    await expect(service.post(entry)).rejects.toThrow(/desbalanceado/);
  });
});
