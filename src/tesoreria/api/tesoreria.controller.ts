import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CuentaDineroService } from '../application/cuenta-dinero.service';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { CrearCuentaDineroDto } from './dto/crear-cuenta-dinero.dto';
import { ActualizarCuentaDineroDto } from './dto/actualizar-cuenta-dinero.dto';
import { TransferenciaDto } from './dto/transferencia.dto';
import { MovimientoCapitalDto } from './dto/movimiento-capital.dto';
import { CuentaDineroPublica, toCuentaDineroPublica } from './cuenta-dinero.presenter';
import { MovimientoCuentaPublico, toMovimientoCuentaPublico } from './movimiento-cuenta.presenter';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('tesoreria')
export class TesoreriaController {
  constructor(private readonly cuentaDineroService: CuentaDineroService) {}

  @Get('cuentas')
  public async listarCuentas(): Promise<CuentaDineroPublica[]> {
    const cuentas = await this.cuentaDineroService.listar();
    return cuentas.map(({ cuenta, saldo }) => toCuentaDineroPublica(cuenta, saldo));
  }

  @Get('cuentas/:id')
  public async obtenerCuenta(@Param('id') id: string): Promise<CuentaDineroPublica> {
    const { cuenta, saldo } = await this.cuentaDineroService.obtener(id);
    return toCuentaDineroPublica(cuenta, saldo);
  }

  @Get('cuentas/:id/movimientos')
  public async movimientos(@Param('id') id: string): Promise<MovimientoCuentaPublico[]> {
    const movimientos = await this.cuentaDineroService.movimientos(id);
    return movimientos.map(toMovimientoCuentaPublico);
  }

  @Post('cuentas')
  public async crearCuenta(@Body() dto: CrearCuentaDineroDto): Promise<CuentaDineroPublica> {
    const cuenta = await this.cuentaDineroService.crear(dto.nombre, dto.tipo, dto.usableEnTaquilla, dto.usableEnBar);
    return this.presentar(cuenta.id);
  }

  @Patch('cuentas/:id')
  public async actualizarCuenta(
    @Param('id') id: string,
    @Body() dto: ActualizarCuentaDineroDto,
  ): Promise<CuentaDineroPublica> {
    await this.cuentaDineroService.actualizar(id, dto.nombre, dto.usableEnTaquilla, dto.usableEnBar);
    return this.presentar(id);
  }

  @Post('cuentas/:id/activar')
  public async activarCuenta(@Param('id') id: string): Promise<CuentaDineroPublica> {
    await this.cuentaDineroService.activar(id);
    return this.presentar(id);
  }

  @Post('cuentas/:id/desactivar')
  public async desactivarCuenta(@Param('id') id: string): Promise<CuentaDineroPublica> {
    await this.cuentaDineroService.desactivar(id);
    return this.presentar(id);
  }

  @Delete('cuentas/:id')
  public async eliminarCuenta(@Param('id') id: string): Promise<{ ok: true }> {
    await this.cuentaDineroService.eliminar(id);
    return { ok: true };
  }

  @Post('transferencias')
  public async transferir(@Body() dto: TransferenciaDto): Promise<{ ok: true }> {
    await this.cuentaDineroService.transferir(dto.origenId, dto.destinoId, dto.importe, dto.concepto);
    return { ok: true };
  }

  @Post('movimientos-capital')
  public async registrarMovimientoCapital(@Body() dto: MovimientoCapitalDto): Promise<{ ok: true }> {
    await this.cuentaDineroService.registrarMovimientoCapital(dto.cuentaId, dto.tipo, dto.importe, dto.concepto);
    return { ok: true };
  }

  private async presentar(id: string): Promise<CuentaDineroPublica> {
    const { cuenta, saldo } = await this.cuentaDineroService.obtener(id);
    return toCuentaDineroPublica(cuenta, saldo);
  }
}
