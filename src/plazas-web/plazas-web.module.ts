import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlazaWebService } from './application/plaza-web.service';
import { PLAZA_WEB_REPOSITORY } from './application/plaza-web.repository';
import { TypeOrmPlazaWebRepository } from './infrastructure/typeorm-plaza-web.repository';
import { PlazaWebOrmEntity } from './infrastructure/orm/plaza-web.orm-entity';
import { FuncionWebService } from './application/funcion-web.service';
import { FUNCION_WEB_REPOSITORY } from './application/funcion-web.repository';
import { TypeOrmFuncionWebRepository } from './infrastructure/typeorm-funcion-web.repository';
import { FuncionWebOrmEntity } from './infrastructure/orm/funcion-web.orm-entity';
import { PlazasWebController } from './api/plazas-web.controller';
import { FuncionesWebController } from './api/funciones-web.controller';
import { PublicoPlazasWebController } from './api/publico-plazas-web.controller';
import { PlazasModule } from '../plazas/plazas.module';

// Entidad independiente de las Plazas contables (backend/src/plazas/) — solo importa
// PlazasModule para poder validar el enlace opcional (PlazaWebService.crear/actualizar
// comprueba que el plazaId, si viene informado, exista de verdad).
@Module({
  imports: [TypeOrmModule.forFeature([PlazaWebOrmEntity, FuncionWebOrmEntity]), PlazasModule],
  controllers: [PlazasWebController, FuncionesWebController, PublicoPlazasWebController],
  providers: [
    PlazaWebService,
    FuncionWebService,
    { provide: PLAZA_WEB_REPOSITORY, useClass: TypeOrmPlazaWebRepository },
    { provide: FUNCION_WEB_REPOSITORY, useClass: TypeOrmFuncionWebRepository },
  ],
  exports: [PlazaWebService, FuncionWebService],
})
export class PlazasWebModule {}
