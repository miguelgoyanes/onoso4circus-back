import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AjusteStock } from '../domain/ajuste-stock';
import { AjusteStockRepository } from '../application/ajuste-stock.repository';
import { AjusteStockOrmEntity } from './orm/ajuste-stock.orm-entity';

function toDomain(orm: AjusteStockOrmEntity): AjusteStock {
  return new AjusteStock(
    orm.id,
    orm.productoId,
    orm.tipo,
    orm.cantidad,
    orm.costeUnitarioAplicado,
    orm.journalEntryId,
    orm.fecha,
    orm.plazaId ?? undefined,
    orm.fechaId ?? undefined,
    orm.paseId ?? undefined,
  );
}

@Injectable()
export class TypeOrmAjusteStockRepository implements AjusteStockRepository {
  constructor(
    @InjectRepository(AjusteStockOrmEntity)
    private readonly repo: Repository<AjusteStockOrmEntity>,
  ) {}

  public async save(ajuste: AjusteStock): Promise<void> {
    await this.repo.save({
      id: ajuste.id,
      productoId: ajuste.productoId,
      tipo: ajuste.tipo,
      cantidad: ajuste.cantidad,
      costeUnitarioAplicado: ajuste.costeUnitarioAplicado,
      plazaId: ajuste.plazaId ?? null,
      fechaId: ajuste.fechaId ?? null,
      paseId: ajuste.paseId ?? null,
      journalEntryId: ajuste.journalEntryId,
      fecha: ajuste.fecha,
    });
  }

  public async findById(id: string): Promise<AjusteStock | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findAll(productoId?: string): Promise<AjusteStock[]> {
    const ajustes = await this.repo.find({
      where: productoId ? { productoId } : {},
      order: { fecha: 'DESC' },
    });
    return ajustes.map(toDomain);
  }

  public async existeConProducto(productoId: string): Promise<boolean> {
    const count = await this.repo.count({ where: { productoId } });
    return count > 0;
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
