import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContratoIngresoService } from './application/contrato-ingreso.service';
import { CONTRATO_INGRESO_REPOSITORY } from './application/contrato-ingreso.repository';
import { TypeOrmContratoIngresoRepository } from './infrastructure/typeorm-contrato-ingreso.repository';
import { ContratoIngresoOrmEntity } from './infrastructure/orm/contrato-ingreso.orm-entity';
import { ContratosIngresoController } from './api/contratos-ingreso.controller';
import { TipoEntradaService } from './application/tipo-entrada.service';
import { TIPO_ENTRADA_REPOSITORY } from './application/tipo-entrada.repository';
import { TypeOrmTipoEntradaRepository } from './infrastructure/typeorm-tipo-entrada.repository';
import { TipoEntradaOrmEntity } from './infrastructure/orm/tipo-entrada.orm-entity';
import { TiposEntradaController } from './api/tipos-entrada.controller';
import { VentaEntradasService } from './application/venta-entradas.service';
import { VENTA_ENTRADAS_REPOSITORY } from './application/venta-entradas.repository';
import { TypeOrmVentaEntradasRepository } from './infrastructure/typeorm-venta-entradas.repository';
import { VentaEntradasOrmEntity } from './infrastructure/orm/venta-entradas.orm-entity';
import { VentasEntradasController } from './api/ventas-entradas.controller';
import { VentasSeedService } from './ventas-seed.service';
import { AccountingModule } from '../accounting/accounting.module';
import { PlazasModule } from '../plazas/plazas.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContratoIngresoOrmEntity, TipoEntradaOrmEntity, VentaEntradasOrmEntity]),
    AccountingModule,
    PlazasModule,
  ],
  controllers: [ContratosIngresoController, TiposEntradaController, VentasEntradasController],
  providers: [
    ContratoIngresoService,
    TipoEntradaService,
    VentaEntradasService,
    VentasSeedService,
    { provide: CONTRATO_INGRESO_REPOSITORY, useClass: TypeOrmContratoIngresoRepository },
    { provide: TIPO_ENTRADA_REPOSITORY, useClass: TypeOrmTipoEntradaRepository },
    { provide: VENTA_ENTRADAS_REPOSITORY, useClass: TypeOrmVentaEntradasRepository },
  ],
  exports: [ContratoIngresoService, TipoEntradaService, VentaEntradasService],
})
export class VentasModule {}
