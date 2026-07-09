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
import { ProductosController } from './api/productos.controller';
import { RecepcionesStockController } from './api/recepciones-stock.controller';
import { AjustesStockController } from './api/ajustes-stock.controller';
import { StockSeedService } from './stock-seed.service';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductoOrmEntity, RecepcionStockOrmEntity, AjusteStockOrmEntity]),
    AccountingModule,
  ],
  controllers: [ProductosController, RecepcionesStockController, AjustesStockController],
  providers: [
    ProductoService,
    RecepcionStockService,
    AjusteStockService,
    StockSeedService,
    { provide: PRODUCTO_REPOSITORY, useClass: TypeOrmProductoRepository },
    { provide: RECEPCION_STOCK_REPOSITORY, useClass: TypeOrmRecepcionStockRepository },
    { provide: AJUSTE_STOCK_REPOSITORY, useClass: TypeOrmAjusteStockRepository },
  ],
  exports: [ProductoService],
})
export class StockModule {}
