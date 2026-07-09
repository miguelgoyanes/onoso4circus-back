import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecepcionStock } from '../domain/recepcion-stock';
import { RecepcionStockRepository } from '../application/recepcion-stock.repository';
import { RecepcionStockOrmEntity } from './orm/recepcion-stock.orm-entity';

function toDomain(orm: RecepcionStockOrmEntity): RecepcionStock {
  return new RecepcionStock({
    id: orm.id,
    productoId: orm.productoId,
    cantidad: orm.cantidad,
    costeUnitario: orm.costeUnitario,
    baseImponible: orm.baseImponible,
    importeTotal: orm.importeTotal,
    fecha: orm.fecha,
    cuentaOrigenId: orm.cuentaOrigenId,
    journalEntryId: orm.journalEntryId,
    plazaId: orm.plazaId ?? undefined,
    tipoFiscal: orm.tipoFiscal ?? undefined,
    ivaPercent: orm.ivaPercent ?? undefined,
    importeIva: orm.importeIva ?? undefined,
  });
}

@Injectable()
export class TypeOrmRecepcionStockRepository implements RecepcionStockRepository {
  constructor(
    @InjectRepository(RecepcionStockOrmEntity)
    private readonly repo: Repository<RecepcionStockOrmEntity>,
  ) {}

  public async save(recepcion: RecepcionStock): Promise<void> {
    await this.repo.save({
      id: recepcion.id,
      productoId: recepcion.productoId,
      cantidad: recepcion.cantidad,
      costeUnitario: recepcion.costeUnitario,
      baseImponible: recepcion.baseImponible,
      importeTotal: recepcion.importeTotal,
      fecha: recepcion.fecha,
      cuentaOrigenId: recepcion.cuentaOrigenId,
      plazaId: recepcion.plazaId ?? null,
      tipoFiscal: recepcion.tipoFiscal ?? null,
      ivaPercent: recepcion.ivaPercent ?? null,
      importeIva: recepcion.importeIva ?? null,
      journalEntryId: recepcion.journalEntryId,
    });
  }

  public async findById(id: string): Promise<RecepcionStock | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findAll(productoId?: string): Promise<RecepcionStock[]> {
    const recepciones = await this.repo.find({
      where: productoId ? { productoId } : {},
      order: { fecha: 'DESC' },
    });
    return recepciones.map(toDomain);
  }

  public async existeConProducto(productoId: string): Promise<boolean> {
    const count = await this.repo.count({ where: { productoId } });
    return count > 0;
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
