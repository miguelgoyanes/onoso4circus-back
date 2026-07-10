import { Module } from '@nestjs/common';
import { ContabilidadService } from './application/contabilidad.service';
import { ContabilidadController } from './api/contabilidad.controller';
import { AccountingModule } from '../accounting/accounting.module';

// Módulo de solo lectura — sin dominio, sin ORM, sin seed. Compone AccountingService para
// exponer Libro diario, Libro mayor, PyG y Balance; no gestiona ningún dato propio.
@Module({
  imports: [AccountingModule],
  controllers: [ContabilidadController],
  providers: [ContabilidadService],
})
export class ContabilidadModule {}
