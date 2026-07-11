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
import { VentaBarService } from './application/venta-bar.service';
import { VENTA_BAR_REPOSITORY } from './application/venta-bar.repository';
import { TypeOrmVentaBarRepository } from './infrastructure/typeorm-venta-bar.repository';
import { VentaBarOrmEntity } from './infrastructure/orm/venta-bar.orm-entity';
import { VentasBarController } from './api/ventas-bar.controller';
import { CosteElaboradoService } from './application/coste-elaborado.service';
import { VentasSeedService } from './ventas-seed.service';
import { AccountingModule } from '../accounting/accounting.module';
import { PlazasModule } from '../plazas/plazas.module';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContratoIngresoOrmEntity, TipoEntradaOrmEntity, VentaEntradasOrmEntity, VentaBarOrmEntity]),
    AccountingModule,
    PlazasModule,
    StockModule,
  ],
  controllers: [ContratosIngresoController, TiposEntradaController, VentasEntradasController, VentasBarController],
  providers: [
    ContratoIngresoService,
    TipoEntradaService,
    VentaEntradasService,
    VentaBarService,
    CosteElaboradoService,
    VentasSeedService,
    { provide: CONTRATO_INGRESO_REPOSITORY, useClass: TypeOrmContratoIngresoRepository },
    { provide: TIPO_ENTRADA_REPOSITORY, useClass: TypeOrmTipoEntradaRepository },
    { provide: VENTA_ENTRADAS_REPOSITORY, useClass: TypeOrmVentaEntradasRepository },
    { provide: VENTA_BAR_REPOSITORY, useClass: TypeOrmVentaBarRepository },
  ],
  exports: [ContratoIngresoService, TipoEntradaService, VentaEntradasService, VentaBarService],
})
export class VentasModule {}
