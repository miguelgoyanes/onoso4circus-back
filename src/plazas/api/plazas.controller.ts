import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PlazaService } from '../application/plaza.service';
import { FechaService } from '../application/fecha.service';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { CrearPlazaDto } from './dto/crear-plaza.dto';
import { CrearFechaDto } from './dto/crear-fecha.dto';
import { PlazaPublica, toPlazaPublica } from './plaza.presenter';
import { FechaPublica, toFechaPublica } from './fecha.presenter';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('plazas')
export class PlazasController {
  constructor(
    private readonly plazaService: PlazaService,
    private readonly fechaService: FechaService,
  ) {}

  @Get()
  public async listar(): Promise<PlazaPublica[]> {
    const plazas = await this.plazaService.listar();
    return plazas.map(toPlazaPublica);
  }

  @Get(':id')
  public async obtener(@Param('id') id: string): Promise<PlazaPublica> {
    const plaza = await this.plazaService.obtener(id);
    return toPlazaPublica(plaza);
  }

  @Post()
  public async crear(@Body() dto: CrearPlazaDto): Promise<PlazaPublica> {
    const plaza = await this.plazaService.crear(dto.nombre, dto.ubicacion);
    return toPlazaPublica(plaza);
  }

  @Patch(':id')
  public async actualizar(
    @Param('id') id: string,
    @Body() dto: CrearPlazaDto,
  ): Promise<PlazaPublica> {
    const plaza = await this.plazaService.actualizar(id, dto.nombre, dto.ubicacion);
    return toPlazaPublica(plaza);
  }

  @Delete(':id')
  public async eliminar(@Param('id') id: string): Promise<{ ok: true }> {
    await this.plazaService.eliminar(id);
    return { ok: true };
  }

  @Get(':plazaId/fechas')
  public async listarFechas(@Param('plazaId') plazaId: string): Promise<FechaPublica[]> {
    const fechas = await this.fechaService.listarPorPlaza(plazaId);
    return fechas.map(toFechaPublica);
  }

  @Post(':plazaId/fechas')
  public async crearFecha(
    @Param('plazaId') plazaId: string,
    @Body() dto: CrearFechaDto,
  ): Promise<FechaPublica> {
    const fecha = await this.fechaService.crear(plazaId, new Date(dto.fecha), dto.tipoActividad);
    return toFechaPublica(fecha);
  }
}
