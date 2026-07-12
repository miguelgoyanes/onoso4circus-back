import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { VentaEntradas } from '../domain/venta-entradas';
import { VentaEntradasFilter, VentaEntradasRepository } from '../application/venta-entradas.repository';
import { VentaEntradasOrmEntity } from './orm/venta-entradas.orm-entity';

function toDomain(orm: VentaEntradasOrmEntity): VentaEntradas {
  return new VentaEntradas({
    id: orm.id,
    paseId: orm.paseId,
    fechaId: orm.fechaId,
    plazaId: orm.plazaId,
    tipoEntradaId: orm.tipoEntradaId,
    cantidad: orm.cantidad,
    precioUnitarioAplicado: orm.precioUnitarioAplicado,
    cuentaCobroId: orm.cuentaCobroId,
    origen: orm.origen,
    numeroEntradaDesde: orm.numeroEntradaDesde ?? undefined,
    numeroEntradaHasta: orm.numeroEntradaHasta ?? undefined,
    tipoFiscal: orm.tipoFiscal ?? undefined,
    ivaPercent: orm.ivaPercent ?? undefined,
    baseImponible: orm.baseImponible ?? undefined,
    importeIva: orm.importeIva ?? undefined,
    journalEntryId: orm.journalEntryId,
    creadoEn: orm.creadoEn,
  });
}

@Injectable()
export class TypeOrmVentaEntradasRepository implements VentaEntradasRepository {
  constructor(
    @InjectRepository(VentaEntradasOrmEntity)
    private readonly repo: Repository<VentaEntradasOrmEntity>,
  ) {}

  public async save(venta: VentaEntradas, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(VentaEntradasOrmEntity) : this.repo;
    await repo.save({
      id: venta.id,
      paseId: venta.paseId,
      fechaId: venta.fechaId,
      plazaId: venta.plazaId,
      tipoEntradaId: venta.tipoEntradaId,
      cantidad: venta.cantidad,
      precioUnitarioAplicado: venta.precioUnitarioAplicado,
      cuentaCobroId: venta.cuentaCobroId,
      origen: venta.origen,
      numeroEntradaDesde: venta.numeroEntradaDesde ?? null,
      numeroEntradaHasta: venta.numeroEntradaHasta ?? null,
      tipoFiscal: venta.tipoFiscal ?? null,
      ivaPercent: venta.ivaPercent ?? null,
      baseImponible: venta.baseImponible ?? null,
      importeIva: venta.importeIva ?? null,
      journalEntryId: venta.journalEntryId,
      creadoEn: venta.creadoEn,
    });
  }

  public async findById(id: string): Promise<VentaEntradas | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findAll(filter?: VentaEntradasFilter): Promise<VentaEntradas[]> {
    const ventas = await this.repo.find({
      where: {
        ...(filter?.paseId ? { paseId: filter.paseId } : {}),
        ...(filter?.fechaId ? { fechaId: filter.fechaId } : {}),
        ...(filter?.plazaId ? { plazaId: filter.plazaId } : {}),
      },
      order: { creadoEn: 'DESC' },
    });
    return ventas.map(toDomain);
  }

  public async existeConTipoEntrada(tipoEntradaId: string): Promise<boolean> {
    const count = await this.repo.count({ where: { tipoEntradaId } });
    return count > 0;
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  public async contarEnRango(desde: Date, hasta: Date): Promise<number> {
    return this.repo
      .createQueryBuilder('venta')
      .innerJoin('fechas', 'f', 'f.id = venta.fecha_id')
      .where('f.fecha >= :desde', { desde })
      .andWhere('f.fecha < :hasta', { hasta })
      .getCount();
  }

  public async listarEnRangoReal(desde: Date, hasta: Date): Promise<VentaEntradas[]> {
    const ventas = await this.repo
      .createQueryBuilder('venta')
      .innerJoin('fechas', 'f', 'f.id = venta.fecha_id')
      .where('f.fecha >= :desde', { desde })
      .andWhere('f.fecha < :hasta', { hasta })
      .getMany();
    return ventas.map(toDomain);
  }
}
