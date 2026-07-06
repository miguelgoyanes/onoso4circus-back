import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountingModule } from './accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
