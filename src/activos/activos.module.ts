import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivoService } from './application/activo.service';
import { ACTIVO_REPOSITORY } from './application/activo.repository';
import { TypeOrmActivoRepository } from './infrastructure/typeorm-activo.repository';
import { ActivoOrmEntity } from './infrastructure/orm/activo.orm-entity';
import { CategoriaActivoService } from './application/categoria-activo.service';
import { CATEGORIA_ACTIVO_REPOSITORY } from './application/categoria-activo.repository';
import { TypeOrmCategoriaActivoRepository } from './infrastructure/typeorm-categoria-activo.repository';
import { CategoriaActivoOrmEntity } from './infrastructure/orm/categoria-activo.orm-entity';
import { ActivosController } from './api/activos.controller';
import { CategoriasActivoController } from './api/categorias-activo.controller';
import { ActivosSeedService } from './activos-seed.service';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [TypeOrmModule.forFeature([ActivoOrmEntity, CategoriaActivoOrmEntity]), AccountingModule],
  controllers: [ActivosController, CategoriasActivoController],
  providers: [
    ActivoService,
    CategoriaActivoService,
    ActivosSeedService,
    { provide: ACTIVO_REPOSITORY, useClass: TypeOrmActivoRepository },
    { provide: CATEGORIA_ACTIVO_REPOSITORY, useClass: TypeOrmCategoriaActivoRepository },
  ],
  exports: [ActivoService, CategoriaActivoService],
})
export class ActivosModule {}
