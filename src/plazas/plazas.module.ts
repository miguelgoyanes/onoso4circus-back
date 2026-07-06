import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlazaService } from './application/plaza.service';
import { FechaService } from './application/fecha.service';
import { PaseService } from './application/pase.service';
import { PLAZA_REPOSITORY } from './application/plaza.repository';
import { FECHA_REPOSITORY } from './application/fecha.repository';
import { PASE_REPOSITORY } from './application/pase.repository';
import { TypeOrmPlazaRepository } from './infrastructure/typeorm-plaza.repository';
import { TypeOrmFechaRepository } from './infrastructure/typeorm-fecha.repository';
import { TypeOrmPaseRepository } from './infrastructure/typeorm-pase.repository';
import { PlazaOrmEntity } from './infrastructure/orm/plaza.orm-entity';
import { FechaOrmEntity } from './infrastructure/orm/fecha.orm-entity';
import { PaseOrmEntity } from './infrastructure/orm/pase.orm-entity';
import { PlazasController } from './api/plazas.controller';
import { FechasController } from './api/fechas.controller';
import { PasesController } from './api/pases.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PlazaOrmEntity, FechaOrmEntity, PaseOrmEntity])],
  controllers: [PlazasController, FechasController, PasesController],
  providers: [
    PlazaService,
    FechaService,
    PaseService,
    { provide: PLAZA_REPOSITORY, useClass: TypeOrmPlazaRepository },
    { provide: FECHA_REPOSITORY, useClass: TypeOrmFechaRepository },
    { provide: PASE_REPOSITORY, useClass: TypeOrmPaseRepository },
  ],
  exports: [PlazaService, FechaService, PaseService],
})
export class PlazasModule {}
