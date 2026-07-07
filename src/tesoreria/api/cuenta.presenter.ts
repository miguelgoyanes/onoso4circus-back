import Decimal from 'decimal.js';
import { Account, AccountType } from '../../accounting/domain/account';

export interface CuentaPublica {
  id: string;
  nombre: string;
  code: string;
  type: AccountType;
  esCuentaDeDinero: boolean;
  saldo?: string;
}

export function toCuentaPublica(account: Account, saldo?: Decimal): CuentaPublica {
  return {
    id: account.id,
    nombre: account.name,
    code: account.code,
    type: account.type,
    esCuentaDeDinero: account.esCuentaDeDinero,
    ...(saldo ? { saldo: saldo.toString() } : {}),
  };
}
