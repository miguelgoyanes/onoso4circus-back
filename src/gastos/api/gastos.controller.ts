import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { GastoService } from '../application/gasto.service';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { CrearGastoDto } from './dto/crear-gasto.dto';
import { PagarGastoDto } from './dto/pagar-gasto.dto';
import { ListarGastosQueryDto } from './dto/listar-gastos-query.dto';
import { GastoPublico, toGastoPublico } from './gasto.presenter';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('gastos')
export class GastosController {
  constructor(private readonly gastoService: GastoService) {}

  @Get()
  public async listar(@Query() query: ListarGastosQueryDto): Promise<GastoPublico[]> {
    const gastos = await this.gastoService.listar({
      plazaId: query.plazaId,
      tipo: query.tipo,
      estadoPago: query.estadoPago,
    });
    return gastos.map(toGastoPublico);
  }

  @Post()
  public async crear(@Body() dto: CrearGastoDto): Promise<GastoPublico> {
    const gasto = await this.gastoService.crear({
      tipo: dto.tipo,
      fecha: new Date(dto.fecha),
      descripcion: dto.descripcion,
      estadoPago: dto.estadoPago,
      cuentaPagoId: dto.cuentaPagoId,
      plazaId: dto.plazaId,
      fechaId: dto.fechaId,
      paseId: dto.paseId,
      empleadoId: dto.empleadoId,
      asignacionId: dto.asignacionId,
      importeSalario: dto.importeSalario,
      costeSs: dto.costeSs,
      gastosDerivados: dto.gastosDerivados,
      categoriaPlaza: dto.categoriaPlaza,
      categoriaGeneral: dto.categoriaGeneral,
      importe: dto.importe,
    });
    return toGastoPublico(gasto);
  }

  @Post(':id/pagar')
  public async pagar(
    @Param('id') id: string,
    @Body() dto: PagarGastoDto,
  ): Promise<GastoPublico> {
    const gasto = await this.gastoService.pagarPendiente(id, dto.cuentaPagoId);
    return toGastoPublico(gasto);
  }
}
