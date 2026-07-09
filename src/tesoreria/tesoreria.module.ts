import { Module } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { TesoreriaController } from './api/tesoreria.controller';
import { CuentaDineroService } from './application/cuenta-dinero.service';
import { TesoreriaSeedService } from './tesoreria-seed.service';

@Module({
  imports: [AccountingModule],
  controllers: [TesoreriaController],
  providers: [CuentaDineroService, TesoreriaSeedService],
})
export class TesoreriaModule {}
