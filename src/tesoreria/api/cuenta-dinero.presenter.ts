import Decimal from 'decimal.js';
import { Account, TipoCuentaDinero } from '../../accounting/domain/account';

export interface CuentaDineroPublica {
  id: string;
  nombre: string;
  tipo: TipoCuentaDinero;
  activa: boolean;
  usableEnTaquilla: boolean;
  usableEnBar: boolean;
  saldo: string;
}

export function toCuentaDineroPublica(cuenta: Account, saldo: Decimal): CuentaDineroPublica {
  return {
    id: cuenta.id,
    nombre: cuenta.name,
    // Solo se presentan cuentas con tipoCuentaDinero ya definido (ver
    // CuentaDineroService.listar/obtener), así que este cast es seguro.
    tipo: cuenta.tipoCuentaDinero as TipoCuentaDinero,
    activa: cuenta.activa,
    usableEnTaquilla: cuenta.usableEnTaquilla,
    usableEnBar: cuenta.usableEnBar,
    saldo: saldo.toString(),
  };
}

// Vista reducida para quien solo necesita elegir dónde se cobra una venta (Bar/Taquilla):
// sin saldo, que es información financiera ajena a registrar una venta.
export interface CuentaCobroPublica {
  id: string;
  nombre: string;
  tipo: TipoCuentaDinero;
  usableEnTaquilla: boolean;
  usableEnBar: boolean;
}

export function toCuentaCobroPublica(cuenta: Account): CuentaCobroPublica {
  return {
    id: cuenta.id,
    nombre: cuenta.name,
    tipo: cuenta.tipoCuentaDinero as TipoCuentaDinero,
    usableEnTaquilla: cuenta.usableEnTaquilla,
    usableEnBar: cuenta.usableEnBar,
  };
}
