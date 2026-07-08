import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoriaGasto } from '../domain/categoria-gasto';
import { CategoriaGastoRepository } from '../application/categoria-gasto.repository';
import { CategoriaGastoOrmEntity } from './orm/categoria-gasto.orm-entity';

function toDomain(orm: CategoriaGastoOrmEntity): CategoriaGasto {
  return new CategoriaGasto(
    orm.id,
    orm.nombre,
    orm.cuentaContableId,
    orm.requiereEmpleado,
    orm.esPagoPersonal,
    orm.aplicaIva,
    orm.esPredefinida,
  );
}

@Injectable()
export class TypeOrmCategoriaGastoRepository implements CategoriaGastoRepository {
  constructor(
    @InjectRepository(CategoriaGastoOrmEntity)
    private readonly repo: Repository<CategoriaGastoOrmEntity>,
  ) {}

  public async save(categoria: CategoriaGasto): Promise<void> {
    await this.repo.save({
      id: categoria.id,
      nombre: categoria.nombre,
      cuentaContableId: categoria.cuentaContableId,
      requiereEmpleado: categoria.requiereEmpleado,
      esPagoPersonal: categoria.esPagoPersonal,
      aplicaIva: categoria.aplicaIva,
      esPredefinida: categoria.esPredefinida,
    });
  }

  public async findById(id: string): Promise<CategoriaGasto | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findByNombre(nombre: string): Promise<CategoriaGasto | null> {
    const orm = await this.repo.findOneBy({ nombre });
    return orm ? toDomain(orm) : null;
  }

  public async findAll(): Promise<CategoriaGasto[]> {
    const categorias = await this.repo.find({ order: { nombre: 'ASC' } });
    return categorias.map(toDomain);
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
