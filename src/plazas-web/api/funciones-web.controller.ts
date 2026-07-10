import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { FuncionWebService } from '../application/funcion-web.service';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { CrearFuncionWebDto } from './dto/crear-funcion-web.dto';
import { FuncionWebPublica, toFuncionWebPublica } from './funcion-web.presenter';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('funciones-web')
export class FuncionesWebController {
  constructor(private readonly funcionWebService: FuncionWebService) {}

  @Get(':id')
  public async obtener(@Param('id') id: string): Promise<FuncionWebPublica> {
    const funcion = await this.funcionWebService.obtener(id);
    return toFuncionWebPublica(funcion);
  }

  @Patch(':id')
  public async actualizar(@Param('id') id: string, @Body() dto: CrearFuncionWebDto): Promise<FuncionWebPublica> {
    const funcion = await this.funcionWebService.actualizar(
      id,
      new Date(dto.fecha),
      dto.horarios,
      dto.oferta?.descuento,
      dto.oferta?.descripcion,
    );
    return toFuncionWebPublica(funcion);
  }

  @Delete(':id')
  public async eliminar(@Param('id') id: string): Promise<{ ok: true }> {
    await this.funcionWebService.eliminar(id);
    return { ok: true };
  }
}
