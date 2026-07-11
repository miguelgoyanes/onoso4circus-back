import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductoService } from './application/producto.service';
import { PRODUCTO_REPOSITORY } from './application/producto.repository';
import { TypeOrmProductoRepository } from './infrastructure/typeorm-producto.repository';
import { ProductoOrmEntity } from './infrastructure/orm/producto.orm-entity';
import { RecepcionStockService } from './application/recepcion-stock.service';
import { RECEPCION_STOCK_REPOSITORY } from './application/recepcion-stock.repository';
import { TypeOrmRecepcionStockRepository } from './infrastructure/typeorm-recepcion-stock.repository';
import { RecepcionStockOrmEntity } from './infrastructure/orm/recepcion-stock.orm-entity';
import { AjusteStockService } from './application/ajuste-stock.service';
import { AJUSTE_STOCK_REPOSITORY } from './application/ajuste-stock.repository';
import { TypeOrmAjusteStockRepository } from './infrastructure/typeorm-ajuste-stock.repository';
import { AjusteStockOrmEntity } from './infrastructure/orm/ajuste-stock.orm-entity';
import { FamiliaElaboradoService } from './application/familia-elaborado.service';
import { FAMILIA_ELABORADO_REPOSITORY } from './application/familia-elaborado.repository';
import { TypeOrmFamiliaElaboradoRepository } from './infrastructure/typeorm-familia-elaborado.repository';
import { FamiliaElaboradoOrmEntity } from './infrastructure/orm/familia-elaborado.orm-entity';
import { VINCULACION_INSUMO_REPOSITORY } from './application/vinculacion-insumo.repository';
import { TypeOrmVinculacionInsumoRepository } from './infrastructure/typeorm-vinculacion-insumo.repository';
import { VinculacionInsumoOrmEntity } from './infrastructure/orm/vinculacion-insumo.orm-entity';
import { ProductosController } from './api/productos.controller';
import { RecepcionesStockController } from './api/recepciones-stock.controller';
import { AjustesStockController } from './api/ajustes-stock.controller';
import { FamiliasElaboradoController } from './api/familias-elaborado.controller';
import { StockSeedService } from './stock-seed.service';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductoOrmEntity,
      RecepcionStockOrmEntity,
      AjusteStockOrmEntity,
      FamiliaElaboradoOrmEntity,
      VinculacionInsumoOrmEntity,
    ]),
    AccountingModule,
  ],
  controllers: [ProductosController, RecepcionesStockController, AjustesStockController, FamiliasElaboradoController],
  providers: [
    ProductoService,
    RecepcionStockService,
    AjusteStockService,
    FamiliaElaboradoService,
    StockSeedService,
    { provide: PRODUCTO_REPOSITORY, useClass: TypeOrmProductoRepository },
    { provide: RECEPCION_STOCK_REPOSITORY, useClass: TypeOrmRecepcionStockRepository },
    { provide: AJUSTE_STOCK_REPOSITORY, useClass: TypeOrmAjusteStockRepository },
    { provide: FAMILIA_ELABORADO_REPOSITORY, useClass: TypeOrmFamiliaElaboradoRepository },
    { provide: VINCULACION_INSUMO_REPOSITORY, useClass: TypeOrmVinculacionInsumoRepository },
  ],
  // RecepcionStockService y FamiliaElaboradoService se exportan para que
  // ventas/CosteElaboradoService pueda leer lotes activos y vinculaciones sin invertir la
  // dependencia (ventas ya depende de stock, nunca al revés).
  exports: [ProductoService, RecepcionStockService, FamiliaElaboradoService],
})
export class StockModule {}
