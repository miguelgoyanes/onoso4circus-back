import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FamiliaElaborado } from '../domain/familia-elaborado';
import { FamiliaElaboradoRepository } from '../application/familia-elaborado.repository';
import { FamiliaElaboradoOrmEntity } from './orm/familia-elaborado.orm-entity';

function toDomain(orm: FamiliaElaboradoOrmEntity): FamiliaElaborado {
  return new FamiliaElaborado(orm.id, orm.nombre);
}

@Injectable()
export class TypeOrmFamiliaElaboradoRepository implements FamiliaElaboradoRepository {
  constructor(
    @InjectRepository(FamiliaElaboradoOrmEntity)
    private readonly repo: Repository<FamiliaElaboradoOrmEntity>,
  ) {}

  public async save(familia: FamiliaElaborado): Promise<void> {
    await this.repo.save({ id: familia.id, nombre: familia.nombre });
  }

  public async findById(id: string): Promise<FamiliaElaborado | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findAll(): Promise<FamiliaElaborado[]> {
    const familias = await this.repo.find({ order: { nombre: 'ASC' } });
    return familias.map(toDomain);
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
