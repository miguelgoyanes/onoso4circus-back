import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { UnitOfWork } from '../application/unit-of-work';

@Injectable()
export class TypeOrmUnitOfWork implements UnitOfWork {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  public async run<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) => fn(manager));
  }
}
