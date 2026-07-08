import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Gasto } from '../domain/gasto';
import { GastoFilter, GastoRepository } from '../application/gasto.repository';
import { GastoOrmEntity } from './orm/gasto.orm-entity';

function toDomain(orm: GastoOrmEntity): Gasto {
  return new Gasto({
    id: orm.id,
    categoriaId: orm.categoriaId,
    fecha: orm.fecha,
    descripcion: orm.descripcion,
    importe: orm.importe,
    estadoPago: orm.estadoPago,
    plazaId: orm.plazaId ?? undefined,
    fechaId: orm.fechaId ?? undefined,
    paseId: orm.paseId ?? undefined,
    empleadoId: orm.empleadoId ?? undefined,
    cuentaPagoId: orm.cuentaPagoId ?? undefined,
    tipoFiscal: orm.tipoFiscal ?? undefined,
    ivaPercent: orm.ivaPercent ?? undefined,
    baseImponible: orm.baseImponible ?? undefined,
    importeIva: orm.importeIva ?? undefined,
    detalle: orm.detalle,
    journalEntryIds: orm.journalEntryIds,
  });
}

@Injectable()
export class TypeOrmGastoRepository implements GastoRepository {
  constructor(
    @InjectRepository(GastoOrmEntity)
    private readonly repo: Repository<GastoOrmEntity>,
  ) {}

  public async save(gasto: Gasto): Promise<void> {
    await this.repo.save({
      id: gasto.id,
      categoriaId: gasto.categoriaId,
      fecha: gasto.fecha,
      descripcion: gasto.descripcion,
      importe: gasto.importe,
      estadoPago: gasto.estadoPago,
      plazaId: gasto.plazaId ?? null,
      fechaId: gasto.fechaId ?? null,
      paseId: gasto.paseId ?? null,
      empleadoId: gasto.empleadoId ?? null,
      cuentaPagoId: gasto.cuentaPagoId ?? null,
      tipoFiscal: gasto.tipoFiscal ?? null,
      ivaPercent: gasto.ivaPercent ?? null,
      baseImponible: gasto.baseImponible ?? null,
      importeIva: gasto.importeIva ?? null,
      detalle: gasto.detalle,
      journalEntryIds: gasto.journalEntryIds,
    });
  }

  public async findById(id: string): Promise<Gasto | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findAll(filter?: GastoFilter): Promise<Gasto[]> {
    const gastos = await this.repo.find({
      where: {
        ...(filter?.plazaId ? { plazaId: filter.plazaId } : {}),
        ...(filter?.categoriaId ? { categoriaId: filter.categoriaId } : {}),
        ...(filter?.estadoPago ? { estadoPago: filter.estadoPago } : {}),
      },
      order: { fecha: 'DESC' },
    });
    return gastos.map(toDomain);
  }

  public async existeConCategoria(categoriaId: string): Promise<boolean> {
    const count = await this.repo.count({ where: { categoriaId } });
    return count > 0;
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
