import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AccountingService } from '../../accounting/application/accounting.service';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { CrearCuentaDto } from './dto/crear-cuenta.dto';
import { CuentaPublica, toCuentaPublica } from './cuenta.presenter';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('tesoreria')
export class TesoreriaController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('cuentas')
  public async listarCuentas(): Promise<CuentaPublica[]> {
    const cuentas = await this.accountingService.listarCuentas();
    return Promise.all(
      cuentas.map(async (cuenta) =>
        toCuentaPublica(cuenta, await this.accountingService.saldoPorCuenta(cuenta.id)),
      ),
    );
  }

  @Post('cuentas')
  public async crearCuenta(@Body() dto: CrearCuentaDto): Promise<CuentaPublica> {
    const cuenta = await this.accountingService.crearCuenta({
      nombre: dto.nombre,
      code: dto.code,
      type: dto.type,
      esCuentaDeDinero: dto.esCuentaDeDinero,
    });
    return toCuentaPublica(cuenta);
  }

  @Get('patrimonio')
  public async patrimonio(): Promise<{ patrimonio: string }> {
    const total = await this.accountingService.patrimonioLiquidoTotal();
    return { patrimonio: total.toString() };
  }
}
