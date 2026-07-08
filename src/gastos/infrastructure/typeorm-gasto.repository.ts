import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Gasto } from '../domain/gasto';
import { GastoFilter, GastoRepository } from '../application/gasto.repository';
import { GastoOrmEntity } from './orm/gasto.orm-entity';

function toDomain(orm: GastoOrmEntity): Gasto {
  return new Gasto({
    id: orm.id,
    tipo: orm.tipo,
    fecha: orm.fecha,
    descripcion: orm.descripcion,
    estadoPago: orm.estadoPago,
    importeTotal: orm.importeTotal,
    plazaId: orm.plazaId ?? undefined,
    fechaId: orm.fechaId ?? undefined,
    paseId: orm.paseId ?? undefined,
    empleadoId: orm.empleadoId ?? undefined,
    asignacionId: orm.asignacionId ?? undefined,
    importeSalario: orm.importeSalario ?? undefined,
    costeSs: orm.costeSs ?? undefined,
    gastosDerivados: orm.gastosDerivados,
    categoriaPlaza: orm.categoriaPlaza ?? undefined,
    categoriaGeneral: orm.categoriaGeneral ?? undefined,
    importe: orm.importe ?? undefined,
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
      tipo: gasto.tipo,
      fecha: gasto.fecha,
      descripcion: gasto.descripcion,
      estadoPago: gasto.estadoPago,
      importeTotal: gasto.importeTotal,
      plazaId: gasto.plazaId ?? null,
      fechaId: gasto.fechaId ?? null,
      paseId: gasto.paseId ?? null,
      empleadoId: gasto.empleadoId ?? null,
      asignacionId: gasto.asignacionId ?? null,
      importeSalario: gasto.importeSalario ?? null,
      costeSs: gasto.costeSs ?? null,
      gastosDerivados: gasto.gastosDerivados,
      categoriaPlaza: gasto.categoriaPlaza ?? null,
      categoriaGeneral: gasto.categoriaGeneral ?? null,
      importe: gasto.importe ?? null,
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
        ...(filter?.tipo ? { tipo: filter.tipo } : {}),
        ...(filter?.estadoPago ? { estadoPago: filter.estadoPago } : {}),
      },
      order: { fecha: 'DESC' },
    });
    return gastos.map(toDomain);
  }
}
