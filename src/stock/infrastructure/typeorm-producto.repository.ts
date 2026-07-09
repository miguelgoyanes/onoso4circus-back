import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Producto } from '../domain/producto';
import { ProductoRepository } from '../application/producto.repository';
import { ProductoOrmEntity } from './orm/producto.orm-entity';

function toDomain(orm: ProductoOrmEntity): Producto {
  return new Producto(
    orm.id,
    orm.nombre,
    orm.precioVentaPublico,
    orm.costeUnitarioActual,
    orm.cantidadActual,
    orm.aplicaIva,
    orm.activo,
    orm.imagenUrl,
    orm.orden,
  );
}

@Injectable()
export class TypeOrmProductoRepository implements ProductoRepository {
  constructor(
    @InjectRepository(ProductoOrmEntity)
    private readonly repo: Repository<ProductoOrmEntity>,
  ) {}

  public async save(producto: Producto): Promise<void> {
    await this.repo.save({
      id: producto.id,
      nombre: producto.nombre,
      precioVentaPublico: producto.precioVentaPublico,
      costeUnitarioActual: producto.costeUnitarioActual,
      cantidadActual: producto.cantidadActual,
      aplicaIva: producto.aplicaIva,
      activo: producto.activo,
      imagenUrl: producto.imagenUrl,
      orden: producto.orden,
    });
  }

  public async findById(id: string): Promise<Producto | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findAll(): Promise<Producto[]> {
    const productos = await this.repo.find({ order: { orden: 'ASC' } });
    return productos.map(toDomain);
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
