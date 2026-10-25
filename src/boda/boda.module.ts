import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ENTIDADES_BODA } from './infrastructure/orm/boda.orm-entities';
import { BodaConfigService } from './application/boda-config.service';
import {
  GrupoService,
  PreguntaService,
} from './application/grupo-pregunta.service';
import { InvitadoService } from './application/invitado.service';
import { PersonaService } from './application/persona.service';
import { RespuestaService } from './application/respuesta.service';
import { InvitacionPublicaService } from './application/invitacion-publica.service';
import {
  BodaConfigController,
  BodaGruposController,
  BodaInvitadosController,
  BodaPreguntasController,
} from './api/boda-admin.controllers';
import { BodaPublicoController } from './api/boda-publico.controller';
import { BodaRateLimitGuard } from './api/rate-limit.guard';

// Módulo aislado de la boda de Brandan y Fátima: no importa ningún otro módulo de negocio y
// sus tablas (boda_*) no tienen relación con las del circo. Para dormirlo basta quitarlo de AppModule.
@Module({
  imports: [TypeOrmModule.forFeature(ENTIDADES_BODA)],
  controllers: [
    BodaInvitadosController,
    BodaGruposController,
    BodaPreguntasController,
    BodaConfigController,
    BodaPublicoController,
  ],
  providers: [
    BodaConfigService,
    GrupoService,
    PreguntaService,
    InvitadoService,
    PersonaService,
    RespuestaService,
    InvitacionPublicaService,
    BodaRateLimitGuard,
  ],
})
export class BodaModule {}
