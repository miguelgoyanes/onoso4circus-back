import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContratoIngresoService } from './application/contrato-ingreso.service';
import { CONTRATO_INGRESO_REPOSITORY } from './application/contrato-ingreso.repository';
import { TypeOrmContratoIngresoRepository } from './infrastructure/typeorm-contrato-ingreso.repository';
import { ContratoIngresoOrmEntity } from './infrastructure/orm/contrato-ingreso.orm-entity';
import { ContratosIngresoController } from './api/contratos-ingreso.controller';
import { VentasSeedService } from './ventas-seed.service';
import { AccountingModule } from '../accounting/accounting.module';
import { PlazasModule } from '../plazas/plazas.module';

@Module({
  imports: [TypeOrmModule.forFeature([ContratoIngresoOrmEntity]), AccountingModule, PlazasModule],
  controllers: [ContratosIngresoController],
  providers: [
    ContratoIngresoService,
    VentasSeedService,
    { provide: CONTRATO_INGRESO_REPOSITORY, useClass: TypeOrmContratoIngresoRepository },
  ],
  exports: [ContratoIngresoService],
})
export class VentasModule {}
