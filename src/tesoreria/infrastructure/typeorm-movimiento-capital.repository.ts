import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovimientoCapital } from '../domain/movimiento-capital';
import { MovimientoCapitalRepository } from '../application/movimiento-capital.repository';
import { MovimientoCapitalOrmEntity } from './orm/movimiento-capital.orm-entity';

function toDomain(orm: MovimientoCapitalOrmEntity): MovimientoCapital {
  return new MovimientoCapital({
    id: orm.id,
    cuentaId: orm.cuentaId,
    tipo: orm.tipo,
    importe: orm.importe,
    concepto: orm.concepto ?? undefined,
    journalEntryId: orm.journalEntryId,
    fecha: orm.fecha,
  });
}

@Injectable()
export class TypeOrmMovimientoCapitalRepository implements MovimientoCapitalRepository {
  constructor(
    @InjectRepository(MovimientoCapitalOrmEntity)
    private readonly repo: Repository<MovimientoCapitalOrmEntity>,
  ) {}

  public async save(movimiento: MovimientoCapital): Promise<void> {
    await this.repo.save({
      id: movimiento.id,
      cuentaId: movimiento.cuentaId,
      tipo: movimiento.tipo,
      importe: movimiento.importe,
      concepto: movimiento.concepto ?? null,
      journalEntryId: movimiento.journalEntryId,
      fecha: movimiento.fecha,
    });
  }

  public async findById(id: string): Promise<MovimientoCapital | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findByJournalEntryId(journalEntryId: string): Promise<MovimientoCapital | null> {
    const orm = await this.repo.findOneBy({ journalEntryId });
    return orm ? toDomain(orm) : null;
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
