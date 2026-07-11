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
import { ActualizarMovimientoCapitalDto } from './dto/actualizar-movimiento-capital.dto';
import { AjusteArqueoDto } from './dto/ajuste-arqueo.dto';
import {
  CuentaCobroPublica,
  CuentaDineroPublica,
  toCuentaCobroPublica,
  toCuentaDineroPublica,
} from './cuenta-dinero.presenter';
import { MovimientoCuentaPublico, toMovimientoCuentaPublico } from './movimiento-cuenta.presenter';
import { TransferenciaPublica, toTransferenciaPublica } from './transferencia.presenter';
import { MovimientoCapitalPublico, toMovimientoCapitalPublico } from './movimiento-capital.presenter';
import { AjusteArqueoPublico, toAjusteArqueoPublico } from './ajuste-arqueo.presenter';

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

  @Get('cuentas-cobro')
  @Roles(Rol.ADMIN, Rol.OPERADOR)
  public async listarCuentasCobro(): Promise<CuentaCobroPublica[]> {
    const cuentas = await this.cuentaDineroService.listar();
    return cuentas.filter(({ cuenta }) => cuenta.activa).map(({ cuenta }) => toCuentaCobroPublica(cuenta));
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

  @Get('transferencias/:id')
  public async obtenerTransferencia(@Param('id') id: string): Promise<TransferenciaPublica> {
    return toTransferenciaPublica(await this.cuentaDineroService.obtenerTransferencia(id));
  }

  @Patch('transferencias/:id')
  public async actualizarTransferencia(
    @Param('id') id: string,
    @Body() dto: TransferenciaDto,
  ): Promise<TransferenciaPublica> {
    const transferencia = await this.cuentaDineroService.actualizarTransferencia(
      id,
      dto.origenId,
      dto.destinoId,
      dto.importe,
      dto.concepto,
    );
    return toTransferenciaPublica(transferencia);
  }

  @Delete('transferencias/:id')
  public async eliminarTransferencia(@Param('id') id: string): Promise<{ ok: true }> {
    await this.cuentaDineroService.eliminarTransferencia(id);
    return { ok: true };
  }

  @Post('movimientos-capital')
  public async registrarMovimientoCapital(@Body() dto: MovimientoCapitalDto): Promise<{ ok: true }> {
    await this.cuentaDineroService.registrarMovimientoCapital(dto.cuentaId, dto.tipo, dto.importe, dto.concepto);
    return { ok: true };
  }

  @Get('movimientos-capital/:id')
  public async obtenerMovimientoCapital(@Param('id') id: string): Promise<MovimientoCapitalPublico> {
    return toMovimientoCapitalPublico(await this.cuentaDineroService.obtenerMovimientoCapital(id));
  }

  @Patch('movimientos-capital/:id')
  public async actualizarMovimientoCapital(
    @Param('id') id: string,
    @Body() dto: ActualizarMovimientoCapitalDto,
  ): Promise<MovimientoCapitalPublico> {
    const movimiento = await this.cuentaDineroService.actualizarMovimientoCapital(id, dto.tipo, dto.importe, dto.concepto);
    return toMovimientoCapitalPublico(movimiento);
  }

  @Delete('movimientos-capital/:id')
  public async eliminarMovimientoCapital(@Param('id') id: string): Promise<{ ok: true }> {
    await this.cuentaDineroService.eliminarMovimientoCapital(id);
    return { ok: true };
  }

  @Post('cuentas/:cuentaId/ajustes-arqueo')
  public async crearAjusteArqueo(
    @Param('cuentaId') cuentaId: string,
    @Body() dto: AjusteArqueoDto,
  ): Promise<AjusteArqueoPublico> {
    const ajuste = await this.cuentaDineroService.crearAjusteArqueo(cuentaId, dto.importeReal, dto.concepto);
    return toAjusteArqueoPublico(ajuste);
  }

  @Get('ajustes-arqueo/:id')
  public async obtenerAjusteArqueo(@Param('id') id: string): Promise<AjusteArqueoPublico> {
    return toAjusteArqueoPublico(await this.cuentaDineroService.obtenerAjusteArqueo(id));
  }

  @Patch('ajustes-arqueo/:id')
  public async actualizarAjusteArqueo(
    @Param('id') id: string,
    @Body() dto: AjusteArqueoDto,
  ): Promise<AjusteArqueoPublico> {
    const ajuste = await this.cuentaDineroService.actualizarAjusteArqueo(id, dto.importeReal, dto.concepto);
    return toAjusteArqueoPublico(ajuste);
  }

  @Delete('ajustes-arqueo/:id')
  public async eliminarAjusteArqueo(@Param('id') id: string): Promise<{ ok: true }> {
    await this.cuentaDineroService.eliminarAjusteArqueo(id);
    return { ok: true };
  }

  private async presentar(id: string): Promise<CuentaDineroPublica> {
    const { cuenta, saldo } = await this.cuentaDineroService.obtener(id);
    return toCuentaDineroPublica(cuenta, saldo);
  }
}
