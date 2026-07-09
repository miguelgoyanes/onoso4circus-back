import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { AccountingService } from '../accounting/application/accounting.service';
import { AccountType } from '../accounting/domain/account';

const CUENTA_CAPITAL = '100';

/** Siembra idempotente de la cuenta de Capital que usan las entradas/salidas de dinero del
 * dueño — nunca se expone al cliente (ver CuentaDineroService.registrarMovimientoCapital),
 * pero tiene que existir antes de postear el primer movimiento. Mismo patrón que
 * VentasSeedService/StockSeedService. */
@Injectable()
export class TesoreriaSeedService implements OnModuleInit {
  constructor(private readonly accountingService: AccountingService) {}

  public async onModuleInit(): Promise<void> {
    try {
      await this.accountingService.obtenerCuentaPorCodigo(CUENTA_CAPITAL);
    } catch (error) {
      if (!(error instanceof NotFoundException)) throw error;
      await this.accountingService.crearCuenta({
        nombre: 'Capital',
        code: CUENTA_CAPITAL,
        type: AccountType.EQUITY,
        esCuentaDeDinero: false,
      });
    }
  }
}
