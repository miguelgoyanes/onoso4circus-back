import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { GastoService } from '../application/gasto.service';
import { CategoriaGastoService } from '../application/categoria-gasto.service';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { CrearGastoDto } from './dto/crear-gasto.dto';
import { PagarGastoDto } from './dto/pagar-gasto.dto';
import { ListarGastosQueryDto } from './dto/listar-gastos-query.dto';
import { GastoPublico, toGastoPublico } from './gasto.presenter';
import { Gasto } from '../domain/gasto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('gastos')
export class GastosController {
  constructor(
    private readonly gastoService: GastoService,
    private readonly categoriaGastoService: CategoriaGastoService,
  ) {}

  @Get()
  public async listar(@Query() query: ListarGastosQueryDto): Promise<GastoPublico[]> {
    const gastos = await this.gastoService.listar({
      plazaId: query.plazaId,
      categoriaId: query.categoriaId,
      estadoPago: query.estadoPago,
    });
    return Promise.all(gastos.map((gasto) => this.presentar(gasto)));
  }

  @Get(':id')
  public async obtener(@Param('id') id: string): Promise<GastoPublico> {
    const gasto = await this.gastoService.obtener(id);
    return this.presentar(gasto);
  }

  @Post()
  public async crear(@Body() dto: CrearGastoDto): Promise<GastoPublico> {
    const gasto = await this.gastoService.crear({
      categoriaId: dto.categoriaId,
      fecha: new Date(dto.fecha),
      descripcion: dto.descripcion,
      estadoPago: dto.estadoPago,
      cuentaPagoId: dto.cuentaPagoId,
      plazaId: dto.plazaId,
      fechaId: dto.fechaId,
      paseId: dto.paseId,
      empleadoId: dto.empleadoId,
      importe: dto.importe,
      tipoFiscal: dto.tipoFiscal,
      ivaPercent: dto.ivaPercent,
      baseImponible: dto.baseImponible,
      conceptos: dto.conceptos,
    });
    return this.presentar(gasto);
  }

  @Post(':id/pagar')
  public async pagar(@Param('id') id: string, @Body() dto: PagarGastoDto): Promise<GastoPublico> {
    const gasto = await this.gastoService.pagarPendiente(id, dto.cuentaPagoId);
    return this.presentar(gasto);
  }

  @Delete(':id')
  public async eliminar(@Param('id') id: string): Promise<{ ok: true }> {
    await this.gastoService.eliminar(id);
    return { ok: true };
  }

  private async presentar(gasto: Gasto): Promise<GastoPublico> {
    const categoria = await this.categoriaGastoService.obtener(gasto.categoriaId);
    return toGastoPublico(gasto, categoria.nombre);
  }
}
