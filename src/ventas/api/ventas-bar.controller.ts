import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { VentaBarService } from '../application/venta-bar.service';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { CrearVentaBarDto } from './dto/crear-venta-bar.dto';
import { ActualizarVentaBarDto } from './dto/actualizar-venta-bar.dto';
import { ReclasificarLoteVentasBarDto } from './dto/reclasificar-lote-ventas-bar.dto';
import { ListarVentasBarQueryDto } from './dto/listar-ventas-bar-query.dto';
import { VentaBarPublica, toVentaBarPublica } from './venta-bar.presenter';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('ventas-bar')
export class VentasBarController {
  constructor(private readonly ventaBarService: VentaBarService) {}

  @Get()
  public async listar(@Query() query: ListarVentasBarQueryDto): Promise<VentaBarPublica[]> {
    const ventas = await this.ventaBarService.listar({
      paseId: query.paseId,
      fechaId: query.fechaId,
      plazaId: query.plazaId,
    });
    return ventas.map(toVentaBarPublica);
  }

  @Get(':id')
  public async obtener(@Param('id') id: string): Promise<VentaBarPublica> {
    const venta = await this.ventaBarService.obtener(id);
    return toVentaBarPublica(venta);
  }

  @Post()
  public async crear(@Body() dto: CrearVentaBarDto): Promise<VentaBarPublica> {
    const venta = await this.ventaBarService.crear(
      dto.paseId,
      dto.cuentaCobroId,
      dto.lineas,
      dto.tipoFiscal,
      dto.ivaPercent,
    );
    return toVentaBarPublica(venta);
  }

  @Patch('reclasificar-lote')
  public async reclasificarLote(@Body() dto: ReclasificarLoteVentasBarDto): Promise<VentaBarPublica[]> {
    const ventas = await this.ventaBarService.reclasificarLote(dto.ids, dto.tipoFiscal, dto.ivaPercent);
    return ventas.map(toVentaBarPublica);
  }

  @Patch(':id')
  public async actualizar(@Param('id') id: string, @Body() dto: ActualizarVentaBarDto): Promise<VentaBarPublica> {
    const venta = await this.ventaBarService.actualizar(id, dto.cuentaCobroId, dto.lineas);
    return toVentaBarPublica(venta);
  }

  @Delete(':id')
  public async eliminar(@Param('id') id: string): Promise<{ ok: true }> {
    await this.ventaBarService.eliminar(id);
    return { ok: true };
  }
}
