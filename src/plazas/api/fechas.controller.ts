import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { FechaService } from '../application/fecha.service';
import { PaseService } from '../application/pase.service';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { CrearFechaDto } from './dto/crear-fecha.dto';
import { CrearPaseDto } from './dto/crear-pase.dto';
import { FechaPublica, toFechaPublica } from './fecha.presenter';
import { PasePublico, toPasePublico } from './pase.presenter';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('fechas')
export class FechasController {
  constructor(
    private readonly fechaService: FechaService,
    private readonly paseService: PaseService,
  ) {}

  @Get(':id')
  public async obtener(@Param('id') id: string): Promise<FechaPublica> {
    const fecha = await this.fechaService.obtener(id);
    return toFechaPublica(fecha);
  }

  @Patch(':id')
  public async actualizar(
    @Param('id') id: string,
    @Body() dto: CrearFechaDto,
  ): Promise<FechaPublica> {
    const fecha = await this.fechaService.actualizar(id, new Date(dto.fecha), dto.tipoActividad);
    return toFechaPublica(fecha);
  }

  @Delete(':id')
  public async eliminar(@Param('id') id: string): Promise<{ ok: true }> {
    await this.fechaService.eliminar(id);
    return { ok: true };
  }

  @Get(':fechaId/pases')
  public async listarPases(@Param('fechaId') fechaId: string): Promise<PasePublico[]> {
    const pases = await this.paseService.listarPorFecha(fechaId);
    return pases.map(toPasePublico);
  }

  @Post(':fechaId/pases')
  public async crearPase(
    @Param('fechaId') fechaId: string,
    @Body() dto: CrearPaseDto,
  ): Promise<PasePublico> {
    const pase = await this.paseService.crear(fechaId, dto.hora, dto.nombre);
    return toPasePublico(pase);
  }
}
