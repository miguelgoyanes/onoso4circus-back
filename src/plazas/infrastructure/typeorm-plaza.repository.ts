import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plaza } from '../domain/plaza';
import { PlazaRepository } from '../application/plaza.repository';
import { PlazaOrmEntity } from './orm/plaza.orm-entity';

function toDomain(orm: PlazaOrmEntity): Plaza {
  return new Plaza(orm.id, orm.nombre, orm.ubicacion);
}

@Injectable()
export class TypeOrmPlazaRepository implements PlazaRepository {
  constructor(
    @InjectRepository(PlazaOrmEntity)
    private readonly repo: Repository<PlazaOrmEntity>,
  ) {}

  public async save(plaza: Plaza): Promise<void> {
    await this.repo.save({ id: plaza.id, nombre: plaza.nombre, ubicacion: plaza.ubicacion });
  }

  public async findById(id: string): Promise<Plaza | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findAll(): Promise<Plaza[]> {
    const plazas = await this.repo.find({ order: { nombre: 'ASC' } });
    return plazas.map(toDomain);
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
