import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VentaBar } from '../domain/venta-bar';
import { VentaBarFilter, VentaBarRepository } from '../application/venta-bar.repository';
import { VentaBarOrmEntity } from './orm/venta-bar.orm-entity';

function toDomain(orm: VentaBarOrmEntity): VentaBar {
  return new VentaBar({
    id: orm.id,
    paseId: orm.paseId,
    fechaId: orm.fechaId,
    plazaId: orm.plazaId,
    cuentaCobroId: orm.cuentaCobroId,
    creadoEn: orm.creadoEn,
    lineas: orm.lineas,
    importeTotal: orm.importeTotal,
    tipoFiscal: orm.tipoFiscal ?? undefined,
    ivaPercent: orm.ivaPercent ?? undefined,
    baseImponible: orm.baseImponible ?? undefined,
    importeIva: orm.importeIva ?? undefined,
    journalEntryId: orm.journalEntryId,
  });
}

@Injectable()
export class TypeOrmVentaBarRepository implements VentaBarRepository {
  constructor(
    @InjectRepository(VentaBarOrmEntity)
    private readonly repo: Repository<VentaBarOrmEntity>,
  ) {}

  public async save(venta: VentaBar): Promise<void> {
    await this.repo.save({
      id: venta.id,
      paseId: venta.paseId,
      fechaId: venta.fechaId,
      plazaId: venta.plazaId,
      cuentaCobroId: venta.cuentaCobroId,
      creadoEn: venta.creadoEn,
      lineas: venta.lineas,
      importeTotal: venta.importeTotal,
      tipoFiscal: venta.tipoFiscal ?? null,
      ivaPercent: venta.ivaPercent ?? null,
      baseImponible: venta.baseImponible ?? null,
      importeIva: venta.importeIva ?? null,
      journalEntryId: venta.journalEntryId,
    });
  }

  public async findById(id: string): Promise<VentaBar | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findAll(filter?: VentaBarFilter): Promise<VentaBar[]> {
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

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
