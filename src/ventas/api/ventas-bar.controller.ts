import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { VentaBarService } from '../application/venta-bar.service';
import { CosteElaboradoService } from '../application/coste-elaborado.service';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { CrearVentaBarDto } from './dto/crear-venta-bar.dto';
import { ActualizarVentaBarDto } from './dto/actualizar-venta-bar.dto';
import { ReclasificarLoteVentasBarDto } from './dto/reclasificar-lote-ventas-bar.dto';
import { ListarVentasBarQueryDto } from './dto/listar-ventas-bar-query.dto';
import { VentaBarPublica, toVentaBarPublica } from './venta-bar.presenter';
import { IniciarUsoLoteDto } from '../../stock/api/dto/iniciar-uso-lote.dto';
import { RecepcionStockPublico, toRecepcionStockPublico } from '../../stock/api/recepcion-stock.presenter';
import { RecepcionStockService } from '../../stock/application/recepcion-stock.service';
import { ProductoService } from '../../stock/application/producto.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.OPERADOR)
@Controller('ventas-bar')
export class VentasBarController {
  constructor(
    private readonly ventaBarService: VentaBarService,
    private readonly costeElaboradoService: CosteElaboradoService,
    private readonly recepcionStockService: RecepcionStockService,
    private readonly productoService: ProductoService,
  ) {}

  @Get()
  public async listar(@Query() query: ListarVentasBarQueryDto): Promise<VentaBarPublica[]> {
    const ventas = await this.ventaBarService.listar({
      paseId: query.paseId,
      fechaId: query.fechaId,
      plazaId: query.plazaId,
    });
    return ventas.map(toVentaBarPublica);
  }

  // Ruta específica antes de ':id' — si no, ':id' la interceptaría como si "coste-elaborado"
  // fuera un id de venta.
  @Get('coste-elaborado/:productoId')
  @Roles(Rol.ADMIN)
  public async costeElaborado(@Param('productoId') productoId: string): Promise<{ costeUnitarioActual: string }> {
    const coste = await this.costeElaboradoService.costeAproximado(productoId);
    return { costeUnitarioActual: coste.toString() };
  }

  // Única acción manual del ciclo de un insumo: cierra el lote anterior (si lo había, con su
  // asiento de coste exacto) antes de abrir este — ver CosteElaboradoService.iniciarUsoLote.
  @Post('lotes/:loteId/iniciar-uso')
  @Roles(Rol.ADMIN)
  public async iniciarUsoLote(
    @Param('loteId') loteId: string,
    @Body() dto: IniciarUsoLoteDto,
  ): Promise<RecepcionStockPublico> {
    const recepcion = await this.costeElaboradoService.iniciarUsoLote(loteId, new Date(dto.fecha));
    const producto = await this.productoService.obtener(recepcion.productoId);
    const loteActivo = await this.recepcionStockService.loteActivo(recepcion.productoId);
    return toRecepcionStockPublico(recepcion, producto.nombre, loteActivo?.id === recepcion.id);
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
  @Roles(Rol.ADMIN)
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
