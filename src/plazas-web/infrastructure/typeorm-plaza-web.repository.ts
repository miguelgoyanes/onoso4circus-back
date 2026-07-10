import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlazaWeb } from '../domain/plaza-web';
import { PlazaWebRepository } from '../application/plaza-web.repository';
import { PlazaWebOrmEntity } from './orm/plaza-web.orm-entity';

function toDomain(orm: PlazaWebOrmEntity): PlazaWeb {
  return new PlazaWeb({
    id: orm.id,
    ciudad: orm.ciudad,
    ubicacion: orm.ubicacion,
    mapsUrl: orm.mapsUrl,
    descripcion: orm.descripcion,
    cartelUrl: orm.cartelUrl,
    entradasUrl: orm.entradasUrl,
    venta: orm.venta,
    horasAntes: orm.horasAntes,
    plazaId: orm.plazaId,
  });
}

@Injectable()
export class TypeOrmPlazaWebRepository implements PlazaWebRepository {
  constructor(
    @InjectRepository(PlazaWebOrmEntity)
    private readonly repo: Repository<PlazaWebOrmEntity>,
  ) {}

  public async save(plazaWeb: PlazaWeb): Promise<void> {
    await this.repo.save({
      id: plazaWeb.id,
      ciudad: plazaWeb.ciudad,
      ubicacion: plazaWeb.ubicacion,
      mapsUrl: plazaWeb.mapsUrl,
      descripcion: plazaWeb.descripcion,
      cartelUrl: plazaWeb.cartelUrl,
      entradasUrl: plazaWeb.entradasUrl,
      venta: plazaWeb.venta,
      horasAntes: plazaWeb.horasAntes,
      plazaId: plazaWeb.plazaId,
    });
  }

  public async findById(id: string): Promise<PlazaWeb | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findAll(): Promise<PlazaWeb[]> {
    const plazasWeb = await this.repo.find({ order: { ciudad: 'ASC' } });
    return plazasWeb.map(toDomain);
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
