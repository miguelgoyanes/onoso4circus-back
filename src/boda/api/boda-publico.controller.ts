import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { InvitacionPublicaService } from '../application/invitacion-publica.service';
import { GuardarRespuestasDto } from './dto/boda.dto';
import { BodaRateLimitGuard } from './rate-limit.guard';

// Sin JWT a propósito: el enlace personal (token) es la identidad del invitado.
@UseGuards(BodaRateLimitGuard)
@Controller('boda/public/invitacion')
export class BodaPublicoController {
  constructor(private readonly invitacionService: InvitacionPublicaService) {}

  @Get(':token')
  public abrir(
    @Param('token') token: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Req() req: Request,
  ) {
    return this.invitacionService.abrir(token, userAgent, req.ip);
  }

  @Put(':token/respuestas')
  public guardar(
    @Param('token') token: string,
    @Body() dto: GuardarRespuestasDto,
  ) {
    return this.invitacionService.guardar(token, dto.respuestas, dto.nombres);
  }
}
