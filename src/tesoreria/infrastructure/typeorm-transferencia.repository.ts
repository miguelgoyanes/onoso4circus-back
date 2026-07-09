import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transferencia } from '../domain/transferencia';
import { TransferenciaRepository } from '../application/transferencia.repository';
import { TransferenciaOrmEntity } from './orm/transferencia.orm-entity';

function toDomain(orm: TransferenciaOrmEntity): Transferencia {
  return new Transferencia({
    id: orm.id,
    origenId: orm.origenId,
    destinoId: orm.destinoId,
    importe: orm.importe,
    concepto: orm.concepto ?? undefined,
    journalEntryId: orm.journalEntryId,
    fecha: orm.fecha,
  });
}

@Injectable()
export class TypeOrmTransferenciaRepository implements TransferenciaRepository {
  constructor(
    @InjectRepository(TransferenciaOrmEntity)
    private readonly repo: Repository<TransferenciaOrmEntity>,
  ) {}

  public async save(transferencia: Transferencia): Promise<void> {
    await this.repo.save({
      id: transferencia.id,
      origenId: transferencia.origenId,
      destinoId: transferencia.destinoId,
      importe: transferencia.importe,
      concepto: transferencia.concepto ?? null,
      journalEntryId: transferencia.journalEntryId,
      fecha: transferencia.fecha,
    });
  }

  public async findById(id: string): Promise<Transferencia | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findByJournalEntryId(journalEntryId: string): Promise<Transferencia | null> {
    const orm = await this.repo.findOneBy({ journalEntryId });
    return orm ? toDomain(orm) : null;
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
