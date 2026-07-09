import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { VentaEntradasService } from '../application/venta-entradas.service';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { CrearLoteVentasEntradasDto } from './dto/crear-lote-ventas-entradas.dto';
import { ActualizarVentaEntradasDto } from './dto/actualizar-venta-entradas.dto';
import { ReclasificarLoteVentasEntradasDto } from './dto/reclasificar-lote-ventas-entradas.dto';
import { ListarVentasEntradasQueryDto } from './dto/listar-ventas-entradas-query.dto';
import { VentaEntradasPublica, toVentaEntradasPublica } from './venta-entradas.presenter';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('ventas-entradas')
export class VentasEntradasController {
  constructor(private readonly ventaEntradasService: VentaEntradasService) {}

  @Get()
  public async listar(@Query() query: ListarVentasEntradasQueryDto): Promise<VentaEntradasPublica[]> {
    const ventas = await this.ventaEntradasService.listar({
      paseId: query.paseId,
      fechaId: query.fechaId,
      plazaId: query.plazaId,
    });
    return ventas.map(toVentaEntradasPublica);
  }

  @Get(':id')
  public async obtener(@Param('id') id: string): Promise<VentaEntradasPublica> {
    const venta = await this.ventaEntradasService.obtener(id);
    return toVentaEntradasPublica(venta);
  }

  @Post()
  public async crearLote(@Body() dto: CrearLoteVentasEntradasDto): Promise<VentaEntradasPublica[]> {
    const ventas = await this.ventaEntradasService.crearLote(dto.paseId, dto.lineas);
    return ventas.map(toVentaEntradasPublica);
  }

  @Patch('reclasificar-lote')
  public async reclasificarLote(@Body() dto: ReclasificarLoteVentasEntradasDto): Promise<VentaEntradasPublica[]> {
    const ventas = await this.ventaEntradasService.reclasificarLote(dto.ids, dto.tipoFiscal, dto.ivaPercent);
    return ventas.map(toVentaEntradasPublica);
  }

  @Patch(':id')
  public async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarVentaEntradasDto,
  ): Promise<VentaEntradasPublica> {
    const venta = await this.ventaEntradasService.actualizar(id, dto);
    return toVentaEntradasPublica(venta);
  }

  @Delete(':id')
  public async eliminar(@Param('id') id: string): Promise<{ ok: true }> {
    await this.ventaEntradasService.eliminar(id);
    return { ok: true };
  }
}
