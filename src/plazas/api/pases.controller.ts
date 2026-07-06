import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { PaseService } from '../application/pase.service';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { CrearPaseDto } from './dto/crear-pase.dto';
import { PasePublico, toPasePublico } from './pase.presenter';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('pases')
export class PasesController {
  constructor(private readonly paseService: PaseService) {}

  @Get(':id')
  public async obtener(@Param('id') id: string): Promise<PasePublico> {
    const pase = await this.paseService.obtener(id);
    return toPasePublico(pase);
  }

  @Patch(':id')
  public async actualizar(
    @Param('id') id: string,
    @Body() dto: CrearPaseDto,
  ): Promise<PasePublico> {
    const pase = await this.paseService.actualizar(id, dto.hora, dto.nombre);
    return toPasePublico(pase);
  }

  @Delete(':id')
  public async eliminar(@Param('id') id: string): Promise<{ ok: true }> {
    await this.paseService.eliminar(id);
    return { ok: true };
  }
}
