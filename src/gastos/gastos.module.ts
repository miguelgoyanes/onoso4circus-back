import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GastoService } from './application/gasto.service';
import { GASTO_REPOSITORY } from './application/gasto.repository';
import { TypeOrmGastoRepository } from './infrastructure/typeorm-gasto.repository';
import { GastoOrmEntity } from './infrastructure/orm/gasto.orm-entity';
import { CategoriaGastoService } from './application/categoria-gasto.service';
import { CATEGORIA_GASTO_REPOSITORY } from './application/categoria-gasto.repository';
import { TypeOrmCategoriaGastoRepository } from './infrastructure/typeorm-categoria-gasto.repository';
import { CategoriaGastoOrmEntity } from './infrastructure/orm/categoria-gasto.orm-entity';
import { GastosController } from './api/gastos.controller';
import { CategoriasGastoController } from './api/categorias-gasto.controller';
import { GastosSeedService } from './gastos-seed.service';
import { AccountingModule } from '../accounting/accounting.module';
import { PlazasModule } from '../plazas/plazas.module';
import { PersonalModule } from '../personal/personal.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GastoOrmEntity, CategoriaGastoOrmEntity]),
    AccountingModule,
    PlazasModule,
    PersonalModule,
  ],
  controllers: [GastosController, CategoriasGastoController],
  providers: [
    GastoService,
    CategoriaGastoService,
    GastosSeedService,
    { provide: GASTO_REPOSITORY, useClass: TypeOrmGastoRepository },
    { provide: CATEGORIA_GASTO_REPOSITORY, useClass: TypeOrmCategoriaGastoRepository },
  ],
  exports: [GastoService, CategoriaGastoService],
})
export class GastosModule {}
