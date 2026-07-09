import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { AccountingService } from '../accounting/application/accounting.service';
import { AccountType } from '../accounting/domain/account';

interface DefinicionCuenta {
  code: string;
  nombre: string;
  type: AccountType;
}

const CUENTAS: DefinicionCuenta[] = [
  { code: '300001', nombre: 'Stock bar', type: AccountType.ASSET },
  { code: '606001', nombre: 'Consumo interno / mermas bar', type: AccountType.EXPENSE },
  // Compartida con Gastos (472001) — se siembra también aquí para que Stock no dependa
  // de que GastosModule se inicialice primero; es idempotente, no crea duplicados.
  { code: '472001', nombre: 'Hacienda Pública, IVA soportado', type: AccountType.ASSET },
];

/** Siembra idempotente de las cuentas contables fijas que necesita Stock (sección 6 del
 * documento de arquitectura). Mismo patrón que GastosSeedService: no requiere ningún dato
 * de un humano, así que se ejecuta sola al arrancar. */
@Injectable()
export class StockSeedService implements OnModuleInit {
  constructor(private readonly accountingService: AccountingService) {}

  public async onModuleInit(): Promise<void> {
    for (const def of CUENTAS) {
      await this.asegurarCuenta(def);
    }
  }

  private async asegurarCuenta(def: DefinicionCuenta): Promise<void> {
    try {
      await this.accountingService.obtenerCuentaPorCodigo(def.code);
    } catch (error) {
      if (!(error instanceof NotFoundException)) throw error;
      await this.accountingService.crearCuenta({
        nombre: def.nombre,
        code: def.code,
        type: def.type,
        esCuentaDeDinero: false,
      });
    }
  }
}
