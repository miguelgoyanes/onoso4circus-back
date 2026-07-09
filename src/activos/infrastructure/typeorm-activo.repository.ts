import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activo } from '../domain/activo';
import { ActivoFilter, ActivoRepository } from '../application/activo.repository';
import { ActivoOrmEntity } from './orm/activo.orm-entity';

function toDomain(orm: ActivoOrmEntity): Activo {
  return new Activo({
    id: orm.id,
    categoriaId: orm.categoriaId,
    nombre: orm.nombre,
    fechaCompra: orm.fechaCompra,
    coste: orm.coste,
    cuentaPagoId: orm.cuentaPagoId,
    tipoFiscal: orm.tipoFiscal ?? undefined,
    ivaPercent: orm.ivaPercent ?? undefined,
    baseImponible: orm.baseImponible ?? undefined,
    importeIva: orm.importeIva ?? undefined,
    vidaUtilAnios: orm.vidaUtilAnios,
    valorResidual: orm.valorResidual,
    activo: orm.activo,
    amortizacionAcumulada: orm.amortizacionAcumulada,
    ultimaAmortizacionRegistradaEn: orm.ultimaAmortizacionRegistradaEn ?? undefined,
    journalEntryCompraId: orm.journalEntryCompraId,
  });
}

@Injectable()
export class TypeOrmActivoRepository implements ActivoRepository {
  constructor(
    @InjectRepository(ActivoOrmEntity)
    private readonly repo: Repository<ActivoOrmEntity>,
  ) {}

  public async save(activo: Activo): Promise<void> {
    await this.repo.save({
      id: activo.id,
      categoriaId: activo.categoriaId,
      nombre: activo.nombre,
      fechaCompra: activo.fechaCompra,
      coste: activo.coste,
      cuentaPagoId: activo.cuentaPagoId,
      tipoFiscal: activo.tipoFiscal ?? null,
      ivaPercent: activo.ivaPercent ?? null,
      baseImponible: activo.baseImponible ?? null,
      importeIva: activo.importeIva ?? null,
      vidaUtilAnios: activo.vidaUtilAnios,
      valorResidual: activo.valorResidual,
      activo: activo.activo,
      amortizacionAcumulada: activo.amortizacionAcumulada,
      ultimaAmortizacionRegistradaEn: activo.ultimaAmortizacionRegistradaEn ?? null,
      journalEntryCompraId: activo.journalEntryCompraId,
    });
  }

  public async findById(id: string): Promise<Activo | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findAll(filter?: ActivoFilter): Promise<Activo[]> {
    const activos = await this.repo.find({
      where: { ...(filter?.categoriaId ? { categoriaId: filter.categoriaId } : {}) },
      order: { fechaCompra: 'DESC' },
    });
    return activos.map(toDomain);
  }

  public async existeConCategoria(categoriaId: string): Promise<boolean> {
    const count = await this.repo.count({ where: { categoriaId } });
    return count > 0;
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
