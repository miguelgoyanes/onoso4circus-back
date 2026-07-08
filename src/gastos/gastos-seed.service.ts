import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { AccountingService } from '../accounting/application/accounting.service';
import { Account, AccountType } from '../accounting/domain/account';
import { CategoriaGastoService } from './application/categoria-gasto.service';

interface DefinicionCuenta {
  code: string;
  nombre: string;
  type: AccountType;
}

interface DefinicionCategoria {
  nombre: string;
  cuentaCode: string | null;
  requiereEmpleado: boolean;
  esPagoPersonal: boolean;
  aplicaIva: boolean;
}

const CUENTAS: DefinicionCuenta[] = [
  { code: '620001', nombre: 'Montaje', type: AccountType.EXPENSE },
  { code: '620002', nombre: 'Desmontaje', type: AccountType.EXPENSE },
  { code: '620003', nombre: 'Alquiler de material', type: AccountType.EXPENSE },
  { code: '620004', nombre: 'Permisos y licencias', type: AccountType.EXPENSE },
  { code: '620005', nombre: 'Otros gastos de plaza', type: AccountType.EXPENSE },
  { code: '629001', nombre: 'Gestoría', type: AccountType.EXPENSE },
  { code: '629002', nombre: 'Seguro general del negocio', type: AccountType.EXPENSE },
  { code: '629003', nombre: 'Marketing y publicidad', type: AccountType.EXPENSE },
  { code: '629004', nombre: 'Suscripciones y software', type: AccountType.EXPENSE },
  { code: '629005', nombre: 'Otros gastos generales', type: AccountType.EXPENSE },
  { code: '669001', nombre: 'Comisiones bancarias', type: AccountType.EXPENSE },
  { code: '669002', nombre: 'Intereses de préstamos/deudas', type: AccountType.EXPENSE },
  { code: '640001', nombre: 'Gasto de personal — salario/honorarios (ligado a plaza)', type: AccountType.EXPENSE },
  { code: '641001', nombre: 'Gasto de personal — estructura', type: AccountType.EXPENSE },
  { code: '642001', nombre: 'Gasto de personal — Seguridad Social a cargo de la empresa', type: AccountType.EXPENSE },
  { code: '643001', nombre: 'Gasto de personal — dietas / seguros / derivados', type: AccountType.EXPENSE },
  { code: '400001', nombre: 'Proveedores / Pendiente de pago', type: AccountType.LIABILITY },
  { code: '472001', nombre: 'Hacienda Pública, IVA soportado', type: AccountType.ASSET },
];

const CATEGORIAS: DefinicionCategoria[] = [
  { nombre: 'Personal: Pago a empleado', cuentaCode: null, requiereEmpleado: true, esPagoPersonal: true, aplicaIva: false },
  { nombre: 'Montaje', cuentaCode: '620001', requiereEmpleado: false, esPagoPersonal: false, aplicaIva: true },
  { nombre: 'Desmontaje', cuentaCode: '620002', requiereEmpleado: false, esPagoPersonal: false, aplicaIva: true },
  { nombre: 'Alquiler de material', cuentaCode: '620003', requiereEmpleado: false, esPagoPersonal: false, aplicaIva: true },
  { nombre: 'Permisos y licencias', cuentaCode: '620004', requiereEmpleado: false, esPagoPersonal: false, aplicaIva: false },
  { nombre: 'Otros gastos de plaza', cuentaCode: '620005', requiereEmpleado: false, esPagoPersonal: false, aplicaIva: true },
  { nombre: 'Gestoría', cuentaCode: '629001', requiereEmpleado: false, esPagoPersonal: false, aplicaIva: true },
  { nombre: 'Seguro general del negocio', cuentaCode: '629002', requiereEmpleado: false, esPagoPersonal: false, aplicaIva: false },
  { nombre: 'Marketing y publicidad', cuentaCode: '629003', requiereEmpleado: false, esPagoPersonal: false, aplicaIva: true },
  { nombre: 'Suscripciones y software', cuentaCode: '629004', requiereEmpleado: false, esPagoPersonal: false, aplicaIva: true },
  { nombre: 'Otros gastos generales', cuentaCode: '629005', requiereEmpleado: false, esPagoPersonal: false, aplicaIva: true },
  { nombre: 'Comisiones bancarias', cuentaCode: '669001', requiereEmpleado: false, esPagoPersonal: false, aplicaIva: false },
  { nombre: 'Intereses de préstamos/deudas', cuentaCode: '669002', requiereEmpleado: false, esPagoPersonal: false, aplicaIva: false },
];

/** Siembra idempotente de las cuentas y categorías predefinidas de la sección 4 del
 * documento de arquitectura. No requiere ningún dato de un humano (a diferencia del
 * seed del OWNER), así que se ejecuta sola al arrancar en vez de exigir un script manual. */
@Injectable()
export class GastosSeedService implements OnModuleInit {
  constructor(
    private readonly accountingService: AccountingService,
    private readonly categoriaGastoService: CategoriaGastoService,
  ) {}

  public async onModuleInit(): Promise<void> {
    const cuentasPorCodigo = new Map<string, Account>();
    for (const def of CUENTAS) {
      cuentasPorCodigo.set(def.code, await this.asegurarCuenta(def));
    }

    for (const def of CATEGORIAS) {
      const cuenta = def.cuentaCode ? cuentasPorCodigo.get(def.cuentaCode) : undefined;
      await this.categoriaGastoService.sembrarPredefinidaSiNoExiste({
        nombre: def.nombre,
        cuentaContableId: cuenta?.id ?? null,
        requiereEmpleado: def.requiereEmpleado,
        esPagoPersonal: def.esPagoPersonal,
        aplicaIva: def.aplicaIva,
      });
    }
  }

  private async asegurarCuenta(def: DefinicionCuenta): Promise<Account> {
    try {
      return await this.accountingService.obtenerCuentaPorCodigo(def.code);
    } catch (error) {
      if (!(error instanceof NotFoundException)) throw error;
      return this.accountingService.crearCuenta({
        nombre: def.nombre,
        code: def.code,
        type: def.type,
        esCuentaDeDinero: false,
      });
    }
  }
}
