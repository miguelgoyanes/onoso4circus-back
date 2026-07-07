import { Module } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { TesoreriaController } from './api/tesoreria.controller';

@Module({
  imports: [AccountingModule],
  controllers: [TesoreriaController],
})
export class TesoreriaModule {}
