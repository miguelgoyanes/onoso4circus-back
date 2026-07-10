import { Module } from '@nestjs/common';
import { AnalisisService } from './application/analisis.service';
import { AnalisisController } from './api/analisis.controller';
import { AccountingModule } from '../accounting/accounting.module';
import { PlazasModule } from '../plazas/plazas.module';
import { GastosModule } from '../gastos/gastos.module';
import { VentasModule } from '../ventas/ventas.module';
import { ActivosModule } from '../activos/activos.module';

// Módulo de solo lectura — sin dominio, sin ORM, sin seed. Compone servicios ya existentes
// de los demás módulos para agregar información, no gestiona ningún dato propio.
@Module({
  imports: [AccountingModule, PlazasModule, GastosModule, VentasModule, ActivosModule],
  controllers: [AnalisisController],
  providers: [AnalisisService],
})
export class AnalisisModule {}
