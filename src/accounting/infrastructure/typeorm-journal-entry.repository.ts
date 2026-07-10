import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { Account } from '../domain/account';
import { JournalEntry } from '../domain/journal-entry';
import { JournalLine } from '../domain/journal-line';
import {
  EntriesByDimensionFilter,
  EntriesByFilter,
  JournalEntryRepository,
  MovimientoCuenta,
} from '../application/journal-entry.repository';
import { AccountOrmEntity } from './orm/account.orm-entity';
import { JournalEntryOrmEntity } from './orm/journal-entry.orm-entity';
import { JournalLineOrmEntity } from './orm/journal-line.orm-entity';

function toDomainAccount(ormAccount: AccountOrmEntity): Account {
  return new Account(ormAccount.id, ormAccount.name, ormAccount.type, ormAccount.code);
}

function toDomainEntry(ormEntry: JournalEntryOrmEntity): JournalEntry {
  return new JournalEntry({
    id: ormEntry.id,
    date: ormEntry.date,
    description: ormEntry.description,
    lines: ormEntry.lines.map(toDomainLine),
  });
}

function toDomainLine(ormLine: JournalLineOrmEntity): JournalLine {
  return new JournalLine({
    account: toDomainAccount(ormLine.account),
    debit: ormLine.debit,
    credit: ormLine.credit,
    dimensions: {
      plazaId: ormLine.plazaId ?? undefined,
      fechaId: ormLine.fechaId ?? undefined,
      paseId: ormLine.paseId ?? undefined,
      categoryTag: ormLine.categoryTag ?? undefined,
      empleadoId: ormLine.empleadoId ?? undefined,
      productoId: ormLine.productoId ?? undefined,
    },
  });
}

@Injectable()
export class TypeOrmJournalEntryRepository implements JournalEntryRepository {
  constructor(
    @InjectRepository(JournalEntryOrmEntity)
    private readonly journalEntryRepo: Repository<JournalEntryOrmEntity>,
    @InjectRepository(AccountOrmEntity)
    private readonly accountRepo: Repository<AccountOrmEntity>,
  ) {}

  public async save(entry: JournalEntry): Promise<void> {
    const ormEntry = new JournalEntryOrmEntity();
    ormEntry.id = entry.id;
    ormEntry.date = entry.date;
    ormEntry.description = entry.description;
    ormEntry.lines = await Promise.all(
      entry.lines.map(async (line) => {
        const account = await this.accountRepo.findOneByOrFail({ id: line.account.id });
        const ormLine = new JournalLineOrmEntity();
        ormLine.id = randomUUID();
        ormLine.account = account;
        ormLine.debit = line.debit;
        ormLine.credit = line.credit;
        ormLine.plazaId = line.dimensions.plazaId;
        ormLine.fechaId = line.dimensions.fechaId;
        ormLine.paseId = line.dimensions.paseId;
        ormLine.categoryTag = line.dimensions.categoryTag;
        ormLine.empleadoId = line.dimensions.empleadoId;
        ormLine.productoId = line.dimensions.productoId;
        return ormLine;
      }),
    );

    await this.journalEntryRepo.save(ormEntry);
  }

  public async findLinesByDimension(
    filter: EntriesByDimensionFilter,
  ): Promise<JournalLine[]> {
    const qb = this.journalEntryRepo
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.lines', 'line')
      .leftJoinAndSelect('line.account', 'account');

    if (filter.fechaDesde) {
      qb.andWhere('entry.date >= :fechaDesde', { fechaDesde: filter.fechaDesde });
    }
    if (filter.fechaHasta) {
      qb.andWhere('entry.date <= :fechaHasta', { fechaHasta: filter.fechaHasta });
    }
    if (filter.plazaId) {
      qb.andWhere('line.plaza_id = :plazaId', { plazaId: filter.plazaId });
    }
    if (filter.fechaId) {
      qb.andWhere('line.fecha_id = :fechaId', { fechaId: filter.fechaId });
    }
    if (filter.paseId) {
      qb.andWhere('line.pase_id = :paseId', { paseId: filter.paseId });
    }
    if (filter.accountId) {
      qb.andWhere('account.id = :accountId', { accountId: filter.accountId });
    }

    const entries = await qb.getMany();
    return entries.flatMap((entry) => entry.lines.map(toDomainLine));
  }

  public async findMovimientosByAccount(accountId: string): Promise<MovimientoCuenta[]> {
    const lines = await this.journalEntryRepo
      .createQueryBuilder('entry')
      .innerJoin('entry.lines', 'line')
      .where('line.account_id = :accountId', { accountId })
      .select([
        'entry.id AS "journalEntryId"',
        'entry.date AS fecha',
        'entry.description AS descripcion',
        'line.debit AS debit',
        'line.credit AS credit',
      ])
      .orderBy('entry.date', 'DESC')
      .addOrderBy('entry.createdAt', 'DESC')
      .getRawMany<{ journalEntryId: string; fecha: Date; descripcion: string; debit: string; credit: string }>();

    return lines.map((l) => ({
      journalEntryId: l.journalEntryId,
      fecha: l.fecha,
      descripcion: l.descripcion,
      debit: new Decimal(l.debit),
      credit: new Decimal(l.credit),
    }));
  }

  public async findMovimientosByAccountEnRango(
    accountId: string,
    fechaDesde?: Date,
    fechaHasta?: Date,
  ): Promise<MovimientoCuenta[]> {
    const qb = this.journalEntryRepo
      .createQueryBuilder('entry')
      .innerJoin('entry.lines', 'line')
      .where('line.account_id = :accountId', { accountId })
      .select([
        'entry.id AS "journalEntryId"',
        'entry.date AS fecha',
        'entry.description AS descripcion',
        'line.debit AS debit',
        'line.credit AS credit',
      ])
      .orderBy('entry.date', 'ASC')
      .addOrderBy('entry.createdAt', 'ASC');

    if (fechaDesde) {
      qb.andWhere('entry.date >= :fechaDesde', { fechaDesde });
    }
    if (fechaHasta) {
      qb.andWhere('entry.date <= :fechaHasta', { fechaHasta });
    }

    const lines = await qb.getRawMany<{
      journalEntryId: string;
      fecha: Date;
      descripcion: string;
      debit: string;
      credit: string;
    }>();

    return lines.map((l) => ({
      journalEntryId: l.journalEntryId,
      fecha: l.fecha,
      descripcion: l.descripcion,
      debit: new Decimal(l.debit),
      credit: new Decimal(l.credit),
    }));
  }

  public async findEntriesByFilter(filter: EntriesByFilter): Promise<JournalEntry[]> {
    const idsQb = this.journalEntryRepo.createQueryBuilder('entry').select('entry.id', 'id').distinct(true);

    if (filter.accountIds && filter.accountIds.length > 0) {
      idsQb.innerJoin('entry.lines', 'line', 'line.account_id IN (:...accountIds)', {
        accountIds: filter.accountIds,
      });
    }
    if (filter.fechaDesde) {
      idsQb.andWhere('entry.date >= :fechaDesde', { fechaDesde: filter.fechaDesde });
    }
    if (filter.fechaHasta) {
      idsQb.andWhere('entry.date <= :fechaHasta', { fechaHasta: filter.fechaHasta });
    }

    const ids = (await idsQb.getRawMany<{ id: string }>()).map((r) => r.id);
    if (ids.length === 0) return [];

    const entries = await this.journalEntryRepo
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.lines', 'line')
      .leftJoinAndSelect('line.account', 'account')
      .where('entry.id IN (:...ids)', { ids })
      .orderBy('entry.date', 'ASC')
      .addOrderBy('entry.createdAt', 'ASC')
      .getMany();

    return entries.map(toDomainEntry);
  }

  public async delete(id: string): Promise<void> {
    await this.journalEntryRepo.delete({ id });
  }
}
