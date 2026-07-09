import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingModule } from '../accounting/accounting.module';
import { TesoreriaController } from './api/tesoreria.controller';
import { CuentaDineroService } from './application/cuenta-dinero.service';
import { TRANSFERENCIA_REPOSITORY } from './application/transferencia.repository';
import { TypeOrmTransferenciaRepository } from './infrastructure/typeorm-transferencia.repository';
import { TransferenciaOrmEntity } from './infrastructure/orm/transferencia.orm-entity';
import { MOVIMIENTO_CAPITAL_REPOSITORY } from './application/movimiento-capital.repository';
import { TypeOrmMovimientoCapitalRepository } from './infrastructure/typeorm-movimiento-capital.repository';
import { MovimientoCapitalOrmEntity } from './infrastructure/orm/movimiento-capital.orm-entity';
import { AJUSTE_ARQUEO_REPOSITORY } from './application/ajuste-arqueo.repository';
import { TypeOrmAjusteArqueoRepository } from './infrastructure/typeorm-ajuste-arqueo.repository';
import { AjusteArqueoOrmEntity } from './infrastructure/orm/ajuste-arqueo.orm-entity';
import { TesoreriaSeedService } from './tesoreria-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransferenciaOrmEntity, MovimientoCapitalOrmEntity, AjusteArqueoOrmEntity]),
    AccountingModule,
  ],
  controllers: [TesoreriaController],
  providers: [
    CuentaDineroService,
    TesoreriaSeedService,
    { provide: TRANSFERENCIA_REPOSITORY, useClass: TypeOrmTransferenciaRepository },
    { provide: MOVIMIENTO_CAPITAL_REPOSITORY, useClass: TypeOrmMovimientoCapitalRepository },
    { provide: AJUSTE_ARQUEO_REPOSITORY, useClass: TypeOrmAjusteArqueoRepository },
  ],
})
export class TesoreriaModule {}
