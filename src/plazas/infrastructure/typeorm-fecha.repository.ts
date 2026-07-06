import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fecha } from '../domain/fecha';
import { FechaRepository } from '../application/fecha.repository';
import { FechaOrmEntity } from './orm/fecha.orm-entity';

function toDomain(orm: FechaOrmEntity): Fecha {
  return new Fecha(orm.id, orm.plazaId, orm.fecha, orm.tipoActividad);
}

@Injectable()
export class TypeOrmFechaRepository implements FechaRepository {
  constructor(
    @InjectRepository(FechaOrmEntity)
    private readonly repo: Repository<FechaOrmEntity>,
  ) {}

  public async save(fecha: Fecha): Promise<void> {
    await this.repo.save({
      id: fecha.id,
      plazaId: fecha.plazaId,
      fecha: fecha.fecha,
      tipoActividad: fecha.tipoActividad,
    });
  }

  public async findById(id: string): Promise<Fecha | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findByPlaza(plazaId: string): Promise<Fecha[]> {
    const fechas = await this.repo.find({ where: { plazaId }, order: { fecha: 'ASC' } });
    return fechas.map(toDomain);
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
