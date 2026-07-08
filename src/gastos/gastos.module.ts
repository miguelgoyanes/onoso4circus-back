import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GastoService } from './application/gasto.service';
import { GASTO_REPOSITORY } from './application/gasto.repository';
import { TypeOrmGastoRepository } from './infrastructure/typeorm-gasto.repository';
import { GastoOrmEntity } from './infrastructure/orm/gasto.orm-entity';
import { GastosController } from './api/gastos.controller';
import { AccountingModule } from '../accounting/accounting.module';
import { PlazasModule } from '../plazas/plazas.module';

@Module({
  imports: [TypeOrmModule.forFeature([GastoOrmEntity]), AccountingModule, PlazasModule],
  controllers: [GastosController],
  providers: [GastoService, { provide: GASTO_REPOSITORY, useClass: TypeOrmGastoRepository }],
  exports: [GastoService],
})
export class GastosModule {}
