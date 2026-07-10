import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FuncionWeb } from '../domain/funcion-web';
import { FuncionWebRepository } from '../application/funcion-web.repository';
import { FuncionWebOrmEntity } from './orm/funcion-web.orm-entity';

function toDomain(orm: FuncionWebOrmEntity): FuncionWeb {
  return new FuncionWeb(orm.id, orm.plazaWebId, orm.fecha, orm.horarios, orm.descuento, orm.descuentoDescripcion);
}

@Injectable()
export class TypeOrmFuncionWebRepository implements FuncionWebRepository {
  constructor(
    @InjectRepository(FuncionWebOrmEntity)
    private readonly repo: Repository<FuncionWebOrmEntity>,
  ) {}

  public async save(funcionWeb: FuncionWeb): Promise<void> {
    await this.repo.save({
      id: funcionWeb.id,
      plazaWebId: funcionWeb.plazaWebId,
      fecha: funcionWeb.fecha,
      horarios: funcionWeb.horarios,
      descuento: funcionWeb.descuento,
      descuentoDescripcion: funcionWeb.descuentoDescripcion,
    });
  }

  public async findById(id: string): Promise<FuncionWeb | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findByPlazaWeb(plazaWebId: string): Promise<FuncionWeb[]> {
    const funciones = await this.repo.find({ where: { plazaWebId }, order: { fecha: 'ASC' } });
    return funciones.map(toDomain);
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
