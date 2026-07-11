import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoEntrada } from '../domain/tipo-entrada';
import { TipoEntradaRepository } from '../application/tipo-entrada.repository';
import { TipoEntradaOrmEntity } from './orm/tipo-entrada.orm-entity';

function toDomain(orm: TipoEntradaOrmEntity): TipoEntrada {
  return new TipoEntrada(
    orm.id,
    orm.nombre,
    orm.precio,
    orm.aplicaIva,
    orm.color,
    orm.modalidad,
    orm.orden,
    orm.activo,
  );
}

@Injectable()
export class TypeOrmTipoEntradaRepository implements TipoEntradaRepository {
  constructor(
    @InjectRepository(TipoEntradaOrmEntity)
    private readonly repo: Repository<TipoEntradaOrmEntity>,
  ) {}

  public async save(tipoEntrada: TipoEntrada): Promise<void> {
    await this.repo.save({
      id: tipoEntrada.id,
      nombre: tipoEntrada.nombre,
      precio: tipoEntrada.precio,
      aplicaIva: tipoEntrada.aplicaIva,
      color: tipoEntrada.color,
      modalidad: tipoEntrada.modalidad,
      orden: tipoEntrada.orden,
      activo: tipoEntrada.activo,
    });
  }

  public async findById(id: string): Promise<TipoEntrada | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findAll(): Promise<TipoEntrada[]> {
    const tipos = await this.repo.find({ order: { orden: 'ASC' } });
    return tipos.map(toDomain);
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
