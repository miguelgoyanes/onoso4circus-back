import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RecepcionStockService } from '../application/recepcion-stock.service';
import { ProductoService } from '../application/producto.service';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { CrearRecepcionStockDto } from './dto/crear-recepcion-stock.dto';
import { ActualizarRecepcionStockDto } from './dto/actualizar-recepcion-stock.dto';
import { ListarPorProductoQueryDto } from './dto/listar-por-producto-query.dto';
import { RecepcionStockPublico, toRecepcionStockPublico } from './recepcion-stock.presenter';
import { RecepcionStock } from '../domain/recepcion-stock';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('recepciones-stock')
export class RecepcionesStockController {
  constructor(
    private readonly recepcionStockService: RecepcionStockService,
    private readonly productoService: ProductoService,
  ) {}

  @Get()
  public async listar(@Query() query: ListarPorProductoQueryDto): Promise<RecepcionStockPublico[]> {
    const recepciones = await this.recepcionStockService.listar(query.productoId);
    return Promise.all(recepciones.map((r) => this.presentar(r)));
  }

  @Post()
  public async crear(@Body() dto: CrearRecepcionStockDto): Promise<RecepcionStockPublico> {
    const recepcion = await this.recepcionStockService.crear({
      productoId: dto.productoId,
      cantidad: dto.cantidad,
      costeUnitario: dto.costeUnitario,
      fecha: new Date(dto.fecha),
      cuentaOrigenId: dto.cuentaOrigenId,
      plazaId: dto.plazaId,
      tipoFiscal: dto.tipoFiscal,
      ivaPercent: dto.ivaPercent,
      baseImponible: dto.baseImponible,
    });
    return this.presentar(recepcion);
  }

  @Patch(':id')
  public async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarRecepcionStockDto,
  ): Promise<RecepcionStockPublico> {
    const recepcion = await this.recepcionStockService.actualizar(id, {
      cantidad: dto.cantidad,
      costeUnitario: dto.costeUnitario,
      fecha: new Date(dto.fecha),
      cuentaOrigenId: dto.cuentaOrigenId,
      plazaId: dto.plazaId,
      tipoFiscal: dto.tipoFiscal,
      ivaPercent: dto.ivaPercent,
      baseImponible: dto.baseImponible,
    });
    return this.presentar(recepcion);
  }

  @Delete(':id')
  public async eliminar(@Param('id') id: string): Promise<{ ok: true }> {
    await this.recepcionStockService.eliminar(id);
    return { ok: true };
  }

  private async presentar(recepcion: RecepcionStock): Promise<RecepcionStockPublico> {
    const producto = await this.productoService.obtener(recepcion.productoId);
    return toRecepcionStockPublico(recepcion, producto.nombre);
  }
}
