import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import Decimal from 'decimal.js';
import { EmpleadoService } from '../application/empleado.service';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { CrearEmpleadoDto } from './dto/crear-empleado.dto';
import { EmpleadoPublico, toEmpleadoPublico } from './empleado.presenter';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('empleados')
export class EmpleadosController {
  constructor(private readonly empleadoService: EmpleadoService) {}

  @Get()
  public async listar(): Promise<EmpleadoPublico[]> {
    const empleados = await this.empleadoService.listar();
    return empleados.map(toEmpleadoPublico);
  }

  @Get(':id')
  public async obtener(@Param('id') id: string): Promise<EmpleadoPublico> {
    const empleado = await this.empleadoService.obtener(id);
    return toEmpleadoPublico(empleado);
  }

  @Post()
  public async crear(@Body() dto: CrearEmpleadoDto): Promise<EmpleadoPublico> {
    const empleado = await this.empleadoService.crear(
      dto.nombre,
      dto.rol,
      dto.regimen,
      dto.importeReferenciaDia != null ? new Decimal(dto.importeReferenciaDia) : undefined,
    );
    return toEmpleadoPublico(empleado);
  }

  @Patch(':id')
  public async actualizar(
    @Param('id') id: string,
    @Body() dto: CrearEmpleadoDto,
  ): Promise<EmpleadoPublico> {
    const empleado = await this.empleadoService.actualizar(
      id,
      dto.nombre,
      dto.rol,
      dto.regimen,
      dto.importeReferenciaDia != null ? new Decimal(dto.importeReferenciaDia) : undefined,
    );
    return toEmpleadoPublico(empleado);
  }

  @Post(':id/desactivar')
  public async desactivar(@Param('id') id: string): Promise<EmpleadoPublico> {
    const empleado = await this.empleadoService.desactivar(id);
    return toEmpleadoPublico(empleado);
  }

  @Post(':id/reactivar')
  public async reactivar(@Param('id') id: string): Promise<EmpleadoPublico> {
    const empleado = await this.empleadoService.reactivar(id);
    return toEmpleadoPublico(empleado);
  }
}
