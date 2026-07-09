import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AjusteStockService } from '../application/ajuste-stock.service';
import { ProductoService } from '../application/producto.service';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { CrearAjusteStockDto } from './dto/crear-ajuste-stock.dto';
import { ActualizarAjusteStockDto } from './dto/actualizar-ajuste-stock.dto';
import { ListarPorProductoQueryDto } from './dto/listar-por-producto-query.dto';
import { AjusteStockPublico, toAjusteStockPublico } from './ajuste-stock.presenter';
import { AjusteStock } from '../domain/ajuste-stock';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('ajustes-stock')
export class AjustesStockController {
  constructor(
    private readonly ajusteStockService: AjusteStockService,
    private readonly productoService: ProductoService,
  ) {}

  @Get()
  public async listar(@Query() query: ListarPorProductoQueryDto): Promise<AjusteStockPublico[]> {
    const ajustes = await this.ajusteStockService.listar(query.productoId);
    return Promise.all(ajustes.map((a) => this.presentar(a)));
  }

  @Post()
  public async crear(@Body() dto: CrearAjusteStockDto): Promise<AjusteStockPublico> {
    const ajuste = await this.ajusteStockService.crear({
      productoId: dto.productoId,
      tipo: dto.tipo,
      cantidad: dto.cantidad,
      fecha: new Date(dto.fecha),
      plazaId: dto.plazaId,
      fechaId: dto.fechaId,
      paseId: dto.paseId,
    });
    return this.presentar(ajuste);
  }

  @Patch(':id')
  public async actualizar(@Param('id') id: string, @Body() dto: ActualizarAjusteStockDto): Promise<AjusteStockPublico> {
    const ajuste = await this.ajusteStockService.actualizar(id, {
      tipo: dto.tipo,
      cantidad: dto.cantidad,
      fecha: new Date(dto.fecha),
      plazaId: dto.plazaId,
      fechaId: dto.fechaId,
      paseId: dto.paseId,
    });
    return this.presentar(ajuste);
  }

  @Delete(':id')
  public async eliminar(@Param('id') id: string): Promise<{ ok: true }> {
    await this.ajusteStockService.eliminar(id);
    return { ok: true };
  }

  private async presentar(ajuste: AjusteStock): Promise<AjusteStockPublico> {
    const producto = await this.productoService.obtener(ajuste.productoId);
    return toAjusteStockPublico(ajuste, producto.nombre);
  }
}
