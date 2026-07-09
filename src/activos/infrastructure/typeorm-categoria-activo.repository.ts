import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoriaActivo } from '../domain/categoria-activo';
import { CategoriaActivoRepository } from '../application/categoria-activo.repository';
import { CategoriaActivoOrmEntity } from './orm/categoria-activo.orm-entity';

function toDomain(orm: CategoriaActivoOrmEntity): CategoriaActivo {
  return new CategoriaActivo(orm.id, orm.nombre, orm.cuentaContableId, orm.aplicaIva, orm.esPredefinida);
}

@Injectable()
export class TypeOrmCategoriaActivoRepository implements CategoriaActivoRepository {
  constructor(
    @InjectRepository(CategoriaActivoOrmEntity)
    private readonly repo: Repository<CategoriaActivoOrmEntity>,
  ) {}

  public async save(categoria: CategoriaActivo): Promise<void> {
    await this.repo.save({
      id: categoria.id,
      nombre: categoria.nombre,
      cuentaContableId: categoria.cuentaContableId,
      aplicaIva: categoria.aplicaIva,
      esPredefinida: categoria.esPredefinida,
    });
  }

  public async findById(id: string): Promise<CategoriaActivo | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findByNombre(nombre: string): Promise<CategoriaActivo | null> {
    const orm = await this.repo.findOneBy({ nombre });
    return orm ? toDomain(orm) : null;
  }

  public async findAll(): Promise<CategoriaActivo[]> {
    const categorias = await this.repo.find({ order: { nombre: 'ASC' } });
    return categorias.map(toDomain);
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
