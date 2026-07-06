import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pase } from '../domain/pase';
import { PaseRepository } from '../application/pase.repository';
import { PaseOrmEntity } from './orm/pase.orm-entity';

function toDomain(orm: PaseOrmEntity): Pase {
  return new Pase(orm.id, orm.fechaId, orm.hora, orm.nombre ?? undefined);
}

@Injectable()
export class TypeOrmPaseRepository implements PaseRepository {
  constructor(
    @InjectRepository(PaseOrmEntity)
    private readonly repo: Repository<PaseOrmEntity>,
  ) {}

  public async save(pase: Pase): Promise<void> {
    await this.repo.save({
      id: pase.id,
      fechaId: pase.fechaId,
      hora: pase.hora,
      nombre: pase.nombre,
    });
  }

  public async findById(id: string): Promise<Pase | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findByFecha(fechaId: string): Promise<Pase[]> {
    const pases = await this.repo.find({ where: { fechaId }, order: { hora: 'ASC' } });
    return pases.map(toDomain);
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
