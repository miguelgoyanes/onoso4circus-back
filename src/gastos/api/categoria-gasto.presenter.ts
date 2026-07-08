import { CategoriaGasto } from '../domain/categoria-gasto';

export interface CategoriaGastoPublica {
  id: string;
  nombre: string;
  cuentaContableId: string | null;
  cuentaContableCode: string | null;
  requiereEmpleado: boolean;
  esPagoPersonal: boolean;
  aplicaIva: boolean;
  esPredefinida: boolean;
  usada: boolean;
}

export function toCategoriaGastoPublica(
  categoria: CategoriaGasto,
  usada: boolean,
  cuentaContableCode: string | null,
): CategoriaGastoPublica {
  return {
    id: categoria.id,
    nombre: categoria.nombre,
    cuentaContableId: categoria.cuentaContableId,
    cuentaContableCode,
    requiereEmpleado: categoria.requiereEmpleado,
    esPagoPersonal: categoria.esPagoPersonal,
    aplicaIva: categoria.aplicaIva,
    esPredefinida: categoria.esPredefinida,
    usada,
  };
}
