import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AjusteArqueo } from '../domain/ajuste-arqueo';
import { AjusteArqueoRepository } from '../application/ajuste-arqueo.repository';
import { AjusteArqueoOrmEntity } from './orm/ajuste-arqueo.orm-entity';

function toDomain(orm: AjusteArqueoOrmEntity): AjusteArqueo {
  return new AjusteArqueo({
    id: orm.id,
    cuentaId: orm.cuentaId,
    importeTeorico: orm.importeTeorico,
    importeReal: orm.importeReal,
    diferencia: orm.diferencia,
    journalEntryId: orm.journalEntryId ?? undefined,
    concepto: orm.concepto ?? undefined,
    fecha: orm.fecha,
  });
}

@Injectable()
export class TypeOrmAjusteArqueoRepository implements AjusteArqueoRepository {
  constructor(
    @InjectRepository(AjusteArqueoOrmEntity)
    private readonly repo: Repository<AjusteArqueoOrmEntity>,
  ) {}

  public async save(ajuste: AjusteArqueo): Promise<void> {
    await this.repo.save({
      id: ajuste.id,
      cuentaId: ajuste.cuentaId,
      importeTeorico: ajuste.importeTeorico,
      importeReal: ajuste.importeReal,
      diferencia: ajuste.diferencia,
      journalEntryId: ajuste.journalEntryId ?? null,
      concepto: ajuste.concepto ?? null,
      fecha: ajuste.fecha,
    });
  }

  public async findById(id: string): Promise<AjusteArqueo | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findByJournalEntryId(journalEntryId: string): Promise<AjusteArqueo | null> {
    const orm = await this.repo.findOneBy({ journalEntryId });
    return orm ? toDomain(orm) : null;
  }

  public async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
