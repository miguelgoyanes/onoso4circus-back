import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AnalisisService } from '../application/analisis.service';
import { finDeDia } from '../../accounting/domain/journal-entry';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { RangoFechasQueryDto, RangoFechasRequeridoQueryDto } from './dto/rango-fechas-query.dto';
import {
  DetallePlazaPublico,
  PuntoFlujoCajaPublico,
  ResumenActivosPublico,
  ResumenGeneralPublico,
  ResumenPlazaPublico,
  toDetallePlazaPublico,
  toPuntoFlujoCajaPublico,
  toResumenActivosPublico,
  toResumenGeneralPublico,
  toResumenPlazaPublico,
} from './analisis.presenter';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('analisis')
export class AnalisisController {
  constructor(private readonly analisisService: AnalisisService) {}

  @Get('resumen')
  public async resumen(@Query() query: RangoFechasRequeridoQueryDto): Promise<ResumenGeneralPublico> {
    const resumen = await this.analisisService.resumenGeneral(new Date(query.desde), finDeDia(query.hasta));
    return toResumenGeneralPublico(resumen);
  }

  @Get('plazas')
  public async plazas(@Query() query: RangoFechasQueryDto): Promise<ResumenPlazaPublico[]> {
    const resultados = await this.analisisService.porPlaza(
      query.desde ? new Date(query.desde) : undefined,
      query.hasta ? finDeDia(query.hasta) : undefined,
    );
    return resultados.map(toResumenPlazaPublico);
  }

  @Get('plazas/:id')
  public async plaza(@Param('id') id: string, @Query() query: RangoFechasQueryDto): Promise<DetallePlazaPublico> {
    const detalle = await this.analisisService.detallePlaza(
      id,
      query.desde ? new Date(query.desde) : undefined,
      query.hasta ? finDeDia(query.hasta) : undefined,
    );
    return toDetallePlazaPublico(detalle);
  }

  @Get('activos')
  public async activos(): Promise<ResumenActivosPublico> {
    const resumen = await this.analisisService.resumenActivos();
    return toResumenActivosPublico(resumen);
  }

  @Get('flujo-caja')
  public async flujoCaja(@Query() query: RangoFechasRequeridoQueryDto): Promise<PuntoFlujoCajaPublico[]> {
    const puntos = await this.analisisService.flujoCaja(new Date(query.desde), finDeDia(query.hasta));
    return puntos.map(toPuntoFlujoCajaPublico);
  }
}
