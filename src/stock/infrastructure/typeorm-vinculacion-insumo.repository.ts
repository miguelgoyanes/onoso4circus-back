import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VinculacionInsumo } from '../domain/vinculacion-insumo';
import { VinculacionInsumoRepository } from '../application/vinculacion-insumo.repository';
import { VinculacionInsumoOrmEntity } from './orm/vinculacion-insumo.orm-entity';

function toDomain(orm: VinculacionInsumoOrmEntity): VinculacionInsumo {
  return new VinculacionInsumo(orm.id, orm.insumoId, orm.familiaElaboradoId);
}

@Injectable()
export class TypeOrmVinculacionInsumoRepository implements VinculacionInsumoRepository {
  constructor(
    @InjectRepository(VinculacionInsumoOrmEntity)
    private readonly repo: Repository<VinculacionInsumoOrmEntity>,
  ) {}

  public async save(vinculacion: VinculacionInsumo): Promise<void> {
    await this.repo.save({
      id: vinculacion.id,
      insumoId: vinculacion.insumoId,
      familiaElaboradoId: vinculacion.familiaElaboradoId,
    });
  }

  public async findById(id: string): Promise<VinculacionInsumo | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findByFamilia(familiaElaboradoId: string): Promise<VinculacionInsumo[]> {
    const vinculaciones = await this.repo.find({ where: { familiaElaboradoId } });
    return vinculaciones.map(toDomain);
  }

  public async findByInsumo(insumoId: string): Promise<VinculacionInsumo | null> {
    const orm = await this.repo.findOneBy({ insumoId });
    return orm ? toDomain(orm) : null;
  }

  public async existeConInsumo(insumoId: string): Promise<boolean> {
    const count = await this.repo.count({ where: { insumoId } });
    return count > 0;
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
