import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ActivoService } from '../application/activo.service';
import { CategoriaActivoService } from '../application/categoria-activo.service';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { CrearActivoDto } from './dto/crear-activo.dto';
import { ActualizarActivoDto } from './dto/actualizar-activo.dto';
import { ListarActivosQueryDto } from './dto/listar-activos-query.dto';
import { ActivoPublico, toActivoPublico } from './activo.presenter';
import { Activo } from '../domain/activo';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('activos')
export class ActivosController {
  constructor(
    private readonly activoService: ActivoService,
    private readonly categoriaActivoService: CategoriaActivoService,
  ) {}

  @Get()
  public async listar(@Query() query: ListarActivosQueryDto): Promise<ActivoPublico[]> {
    const activos = await this.activoService.listar({ categoriaId: query.categoriaId });
    return Promise.all(activos.map((activo) => this.presentar(activo)));
  }

  @Get(':id')
  public async obtener(@Param('id') id: string): Promise<ActivoPublico> {
    const activo = await this.activoService.obtener(id);
    return this.presentar(activo);
  }

  @Post()
  public async crear(@Body() dto: CrearActivoDto): Promise<ActivoPublico> {
    const activo = await this.activoService.crear({
      categoriaId: dto.categoriaId,
      nombre: dto.nombre,
      fechaCompra: new Date(dto.fechaCompra),
      cuentaPagoId: dto.cuentaPagoId,
      tipoFiscal: dto.tipoFiscal,
      ivaPercent: dto.ivaPercent,
      baseImponible: dto.baseImponible,
      importe: dto.importe,
      vidaUtilAnios: dto.vidaUtilAnios,
      valorResidual: dto.valorResidual,
    });
    return this.presentar(activo);
  }

  @Patch(':id')
  public async actualizar(@Param('id') id: string, @Body() dto: ActualizarActivoDto): Promise<ActivoPublico> {
    const activo = await this.activoService.actualizar(id, {
      nombre: dto.nombre,
      vidaUtilAnios: dto.vidaUtilAnios,
      valorResidual: dto.valorResidual,
      economia: dto.economia
        ? {
            categoriaId: dto.economia.categoriaId,
            fechaCompra: new Date(dto.economia.fechaCompra),
            cuentaPagoId: dto.economia.cuentaPagoId,
            tipoFiscal: dto.economia.tipoFiscal,
            ivaPercent: dto.economia.ivaPercent,
            baseImponible: dto.economia.baseImponible,
            importe: dto.economia.importe,
          }
        : undefined,
    });
    return this.presentar(activo);
  }

  @Post(':id/dar-de-baja')
  public async darDeBaja(@Param('id') id: string): Promise<ActivoPublico> {
    const activo = await this.activoService.darDeBaja(id);
    return this.presentar(activo);
  }

  @Post(':id/reactivar')
  public async reactivar(@Param('id') id: string): Promise<ActivoPublico> {
    const activo = await this.activoService.reactivar(id);
    return this.presentar(activo);
  }

  @Delete(':id')
  public async eliminar(@Param('id') id: string): Promise<{ ok: true }> {
    await this.activoService.eliminar(id);
    return { ok: true };
  }

  private async presentar(activo: Activo): Promise<ActivoPublico> {
    const categoria = await this.categoriaActivoService.obtener(activo.categoriaId);
    return toActivoPublico(activo, categoria.nombre);
  }
}
