import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FamiliaElaboradoService } from '../application/familia-elaborado.service';
import { ProductoService } from '../application/producto.service';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { CrearFamiliaElaboradoDto } from './dto/crear-familia-elaborado.dto';
import { VincularInsumoDto } from './dto/vincular-insumo.dto';
import {
  FamiliaElaboradoPublica,
  toFamiliaElaboradoPublica,
  VinculacionInsumoPublica,
  toVinculacionInsumoPublica,
} from './familia-elaborado.presenter';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('familias-elaborado')
export class FamiliasElaboradoController {
  constructor(
    private readonly familiaService: FamiliaElaboradoService,
    private readonly productoService: ProductoService,
  ) {}

  @Get()
  public async listar(): Promise<FamiliaElaboradoPublica[]> {
    const familias = await this.familiaService.listar();
    return familias.map(toFamiliaElaboradoPublica);
  }

  @Post()
  public async crear(@Body() dto: CrearFamiliaElaboradoDto): Promise<FamiliaElaboradoPublica> {
    const familia = await this.familiaService.crear(dto.nombre);
    return toFamiliaElaboradoPublica(familia);
  }

  @Get(':id/insumos')
  public async listarInsumos(@Param('id') id: string): Promise<VinculacionInsumoPublica[]> {
    const vinculaciones = await this.familiaService.listarInsumosDe(id);
    return Promise.all(
      vinculaciones.map(async (v) => {
        const insumo = await this.productoService.obtener(v.insumoId);
        return toVinculacionInsumoPublica(v, insumo.nombre);
      }),
    );
  }

  @Post(':id/insumos')
  public async vincularInsumo(
    @Param('id') id: string,
    @Body() dto: VincularInsumoDto,
  ): Promise<VinculacionInsumoPublica> {
    const vinculacion = await this.familiaService.vincularInsumo(id, dto.insumoId);
    const insumo = await this.productoService.obtener(dto.insumoId);
    return toVinculacionInsumoPublica(vinculacion, insumo.nombre);
  }

  @Delete('vinculaciones/:vinculacionId')
  public async desvincularInsumo(@Param('vinculacionId') vinculacionId: string): Promise<{ ok: true }> {
    await this.familiaService.desvincularInsumo(vinculacionId);
    return { ok: true };
  }
}
