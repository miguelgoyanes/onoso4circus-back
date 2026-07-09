import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { AccountingService } from '../accounting/application/accounting.service';
import { AccountType } from '../accounting/domain/account';

interface DefinicionCuenta {
  code: string;
  nombre: string;
  type: AccountType;
  esCuentaDeDinero?: boolean;
}

// Cuentas de Contratos (Fase 1) + Taquilla (Fase 2) + Bar (Fase 3). La cuenta de cobro de
// cada venta la elige Brandon libremente entre sus cuentas de dinero ya creadas en Tesorería
// (cuentaCobroId) — no hay cuentas de caja/banco fijas que sembrar aquí.
// 300001 (Stock bar) y 606001 (Consumo interno/mermas) ya las siembra StockSeedService.
const CUENTAS: DefinicionCuenta[] = [
  { code: '702001', nombre: 'Ingresos por contrato', type: AccountType.INCOME },
  { code: '430001', nombre: 'Clientes / Pendiente de cobro', type: AccountType.ASSET },
  { code: '477001', nombre: 'Hacienda Pública, IVA repercutido', type: AccountType.LIABILITY },
  { code: '700001', nombre: 'Ingresos taquilla', type: AccountType.INCOME },
  { code: '701001', nombre: 'Ingresos bar', type: AccountType.INCOME },
  { code: '600001', nombre: 'Coste de producto vendido — bar', type: AccountType.EXPENSE },
];

/** Siembra idempotente de las cuentas contables fijas que necesita Ventas (sección 5/6 del
 * documento de arquitectura). Mismo patrón que GastosSeedService/StockSeedService. */
@Injectable()
export class VentasSeedService implements OnModuleInit {
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
        esCuentaDeDinero: def.esCuentaDeDinero ?? false,
      });
    }
  }
}
