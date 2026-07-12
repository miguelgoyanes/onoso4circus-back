import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecepcionStock } from '../domain/recepcion-stock';
import { RecepcionStockFilter, RecepcionStockRepository } from '../application/recepcion-stock.repository';
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
    cuentaOrigenId: orm.cuentaOrigenId ?? undefined,
    estadoPago: orm.estadoPago,
    journalEntryId: orm.journalEntryId,
    pagoJournalEntryId: orm.pagoJournalEntryId,
    plazaId: orm.plazaId ?? undefined,
    tipoFiscal: orm.tipoFiscal ?? undefined,
    ivaPercent: orm.ivaPercent ?? undefined,
    importeIva: orm.importeIva ?? undefined,
    cantidadMedida: orm.cantidadMedida ?? undefined,
    unidadMedida: orm.unidadMedida ?? undefined,
    fechaInicioUso: orm.fechaInicioUso,
    cierreJournalEntryId: orm.cierreJournalEntryId,
    cerrado: orm.cerrado,
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
      cuentaOrigenId: recepcion.cuentaOrigenId ?? null,
      estadoPago: recepcion.estadoPago,
      plazaId: recepcion.plazaId ?? null,
      tipoFiscal: recepcion.tipoFiscal ?? null,
      ivaPercent: recepcion.ivaPercent ?? null,
      importeIva: recepcion.importeIva ?? null,
      journalEntryId: recepcion.journalEntryId,
      pagoJournalEntryId: recepcion.pagoJournalEntryId ?? null,
      cantidadMedida: recepcion.cantidadMedida ?? null,
      unidadMedida: recepcion.unidadMedida ?? null,
      fechaInicioUso: recepcion.fechaInicioUso ?? null,
      cierreJournalEntryId: recepcion.cierreJournalEntryId ?? null,
      cerrado: recepcion.cerrado ?? false,
    });
  }

  public async findById(id: string): Promise<RecepcionStock | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findAll(filter?: RecepcionStockFilter): Promise<RecepcionStock[]> {
    const recepciones = await this.repo.find({
      where: {
        ...(filter?.productoId ? { productoId: filter.productoId } : {}),
        ...(filter?.estadoPago ? { estadoPago: filter.estadoPago } : {}),
      },
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
