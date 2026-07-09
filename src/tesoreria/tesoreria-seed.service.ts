import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { AccountingService } from '../accounting/application/accounting.service';
import { AccountType } from '../accounting/domain/account';

const CUENTA_CAPITAL = '100';
const CUENTA_DIFERENCIA_FALTA = '668001';
const CUENTA_DIFERENCIA_SOBRA = '778001';

/** Siembra idempotente de las cuentas fijas que usa Tesorería por debajo, nunca expuestas
 * directamente al cliente: Capital (entradas/salidas de dinero del dueño, ver
 * CuentaDineroService.registrarMovimientoCapital) y las dos cuentas de descuadre de Arqueo de
 * caja (ver ArqueoCajaService.cerrar). Mismo patrón que VentasSeedService/StockSeedService. */
@Injectable()
export class TesoreriaSeedService implements OnModuleInit {
  constructor(private readonly accountingService: AccountingService) {}

  public async onModuleInit(): Promise<void> {
    await this.sembrar(CUENTA_CAPITAL, 'Capital', AccountType.EQUITY);
    await this.sembrar(CUENTA_DIFERENCIA_FALTA, 'Diferencia de caja (falta)', AccountType.EXPENSE);
    await this.sembrar(CUENTA_DIFERENCIA_SOBRA, 'Diferencia de caja (sobra)', AccountType.INCOME);
  }

  private async sembrar(code: string, nombre: string, type: AccountType): Promise<void> {
    try {
      await this.accountingService.obtenerCuentaPorCodigo(code);
    } catch (error) {
      if (!(error instanceof NotFoundException)) throw error;
      await this.accountingService.crearCuenta({ nombre, code, type, esCuentaDeDinero: false });
    }
  }
}
