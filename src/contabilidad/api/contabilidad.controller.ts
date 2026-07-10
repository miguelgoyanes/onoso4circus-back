import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ContabilidadService } from '../application/contabilidad.service';
import { finDeDia } from '../../accounting/domain/journal-entry';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { RangoFechasRequeridoQueryDto } from './dto/rango-fechas-query.dto';
import { FechaRequeridaQueryDto } from './dto/fecha-requerida-query.dto';
import { DiarioQueryDto } from './dto/diario-query.dto';
import {
  AsientoPublico,
  BalancePublico,
  CuentaResumenPublico,
  LibroMayorPublico,
  PygPublico,
  toAsientoPublico,
  toBalancePublico,
  toCuentaResumenPublico,
  toLibroMayorPublico,
  toPygPublico,
} from './contabilidad.presenter';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('contabilidad')
export class ContabilidadController {
  constructor(private readonly contabilidadService: ContabilidadService) {}

  @Get('cuentas')
  public async cuentas(): Promise<CuentaResumenPublico[]> {
    const cuentas = await this.contabilidadService.listarCuentas();
    return cuentas.map(toCuentaResumenPublico);
  }

  @Get('diario')
  public async diario(@Query() query: DiarioQueryDto): Promise<AsientoPublico[]> {
    const asientos = await this.contabilidadService.libroDiario({
      accountIds: query.cuentaIds ? query.cuentaIds.split(',').filter(Boolean) : undefined,
      fechaDesde: query.desde ? new Date(query.desde) : undefined,
      fechaHasta: query.hasta ? finDeDia(query.hasta) : undefined,
    });
    return asientos.map(toAsientoPublico);
  }

  @Get('mayor/:cuentaId')
  public async mayor(
    @Param('cuentaId') cuentaId: string,
    @Query() query: RangoFechasRequeridoQueryDto,
  ): Promise<LibroMayorPublico> {
    const libroMayor = await this.contabilidadService.libroMayor(
      cuentaId,
      new Date(query.desde),
      finDeDia(query.hasta),
    );
    return toLibroMayorPublico(libroMayor);
  }

  @Get('pyg')
  public async pyg(@Query() query: RangoFechasRequeridoQueryDto): Promise<PygPublico> {
    const pyg = await this.contabilidadService.pyg(new Date(query.desde), finDeDia(query.hasta));
    return toPygPublico(pyg);
  }

  @Get('balance')
  public async balance(@Query() query: FechaRequeridaQueryDto): Promise<BalancePublico> {
    const balance = await this.contabilidadService.balance(finDeDia(query.fecha));
    return toBalancePublico(balance);
  }
}
