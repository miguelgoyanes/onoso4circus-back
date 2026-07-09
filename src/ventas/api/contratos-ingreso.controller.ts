import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ContratoIngresoService } from '../application/contrato-ingreso.service';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { CrearContratoIngresoDto } from './dto/crear-contrato-ingreso.dto';
import { ActualizarContratoIngresoDto } from './dto/actualizar-contrato-ingreso.dto';
import { CobrarContratoIngresoDto } from './dto/cobrar-contrato-ingreso.dto';
import { ListarContratosIngresoQueryDto } from './dto/listar-contratos-ingreso-query.dto';
import { ContratoIngresoPublico, toContratoIngresoPublico } from './contrato-ingreso.presenter';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('contratos-ingreso')
export class ContratosIngresoController {
  constructor(private readonly contratoIngresoService: ContratoIngresoService) {}

  @Get()
  public async listar(@Query() query: ListarContratosIngresoQueryDto): Promise<ContratoIngresoPublico[]> {
    const contratos = await this.contratoIngresoService.listar({
      plazaId: query.plazaId,
      estadoCobro: query.estadoCobro,
    });
    return contratos.map(toContratoIngresoPublico);
  }

  @Get(':id')
  public async obtener(@Param('id') id: string): Promise<ContratoIngresoPublico> {
    const contrato = await this.contratoIngresoService.obtener(id);
    return toContratoIngresoPublico(contrato);
  }

  @Post()
  public async crear(@Body() dto: CrearContratoIngresoDto): Promise<ContratoIngresoPublico> {
    const contrato = await this.contratoIngresoService.crear({
      cliente: dto.cliente,
      concepto: dto.concepto,
      fecha: new Date(dto.fecha),
      estadoCobro: dto.estadoCobro,
      cuentaDestinoId: dto.cuentaDestinoId,
      plazaId: dto.plazaId,
      fechaId: dto.fechaId,
      paseId: dto.paseId,
      tipoFiscal: dto.tipoFiscal,
      importe: dto.importe,
      ivaPercent: dto.ivaPercent,
      baseImponible: dto.baseImponible,
    });
    return toContratoIngresoPublico(contrato);
  }

  @Patch(':id')
  public async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarContratoIngresoDto,
  ): Promise<ContratoIngresoPublico> {
    const contrato = await this.contratoIngresoService.actualizar(id, {
      cliente: dto.cliente,
      concepto: dto.concepto,
      fecha: new Date(dto.fecha),
      tipoFiscal: dto.tipoFiscal,
      importe: dto.importe,
      ivaPercent: dto.ivaPercent,
      baseImponible: dto.baseImponible,
    });
    return toContratoIngresoPublico(contrato);
  }

  @Post(':id/cobrar')
  public async cobrar(
    @Param('id') id: string,
    @Body() dto: CobrarContratoIngresoDto,
  ): Promise<ContratoIngresoPublico> {
    const contrato = await this.contratoIngresoService.cobrar(id, dto.cuentaDestinoId);
    return toContratoIngresoPublico(contrato);
  }

  @Delete(':id')
  public async eliminar(@Param('id') id: string): Promise<{ ok: true }> {
    await this.contratoIngresoService.eliminar(id);
    return { ok: true };
  }
}
