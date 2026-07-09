import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContratoIngreso } from '../domain/contrato-ingreso';
import { ContratoIngresoFilter, ContratoIngresoRepository } from '../application/contrato-ingreso.repository';
import { ContratoIngresoOrmEntity } from './orm/contrato-ingreso.orm-entity';

function toDomain(orm: ContratoIngresoOrmEntity): ContratoIngreso {
  return new ContratoIngreso({
    id: orm.id,
    cliente: orm.cliente,
    concepto: orm.concepto,
    importe: orm.importe,
    fecha: orm.fecha,
    estadoCobro: orm.estadoCobro,
    plazaId: orm.plazaId ?? undefined,
    fechaId: orm.fechaId ?? undefined,
    paseId: orm.paseId ?? undefined,
    cuentaDestinoId: orm.cuentaDestinoId ?? undefined,
    tipoFiscal: orm.tipoFiscal ?? undefined,
    ivaPercent: orm.ivaPercent ?? undefined,
    baseImponible: orm.baseImponible ?? undefined,
    importeIva: orm.importeIva ?? undefined,
    journalEntryIds: orm.journalEntryIds,
  });
}

@Injectable()
export class TypeOrmContratoIngresoRepository implements ContratoIngresoRepository {
  constructor(
    @InjectRepository(ContratoIngresoOrmEntity)
    private readonly repo: Repository<ContratoIngresoOrmEntity>,
  ) {}

  public async save(contrato: ContratoIngreso): Promise<void> {
    await this.repo.save({
      id: contrato.id,
      cliente: contrato.cliente,
      concepto: contrato.concepto,
      importe: contrato.importe,
      fecha: contrato.fecha,
      estadoCobro: contrato.estadoCobro,
      plazaId: contrato.plazaId ?? null,
      fechaId: contrato.fechaId ?? null,
      paseId: contrato.paseId ?? null,
      cuentaDestinoId: contrato.cuentaDestinoId ?? null,
      tipoFiscal: contrato.tipoFiscal ?? null,
      ivaPercent: contrato.ivaPercent ?? null,
      baseImponible: contrato.baseImponible ?? null,
      importeIva: contrato.importeIva ?? null,
      journalEntryIds: contrato.journalEntryIds,
    });
  }

  public async findById(id: string): Promise<ContratoIngreso | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findAll(filter?: ContratoIngresoFilter): Promise<ContratoIngreso[]> {
    const contratos = await this.repo.find({
      where: {
        ...(filter?.plazaId ? { plazaId: filter.plazaId } : {}),
        ...(filter?.estadoCobro ? { estadoCobro: filter.estadoCobro } : {}),
      },
      order: { fecha: 'DESC' },
    });
    return contratos.map(toDomain);
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
