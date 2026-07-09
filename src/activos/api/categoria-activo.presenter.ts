import { CategoriaActivo } from '../domain/categoria-activo';

export interface CategoriaActivoPublica {
  id: string;
  nombre: string;
  cuentaContableId: string;
  cuentaContableCode: string;
  aplicaIva: boolean;
  esPredefinida: boolean;
  usada: boolean;
}

export function toCategoriaActivoPublica(
  categoria: CategoriaActivo,
  usada: boolean,
  cuentaContableCode: string,
): CategoriaActivoPublica {
  return {
    id: categoria.id,
    nombre: categoria.nombre,
    cuentaContableId: categoria.cuentaContableId,
    cuentaContableCode,
    aplicaIva: categoria.aplicaIva,
    esPredefinida: categoria.esPredefinida,
    usada,
  };
}
