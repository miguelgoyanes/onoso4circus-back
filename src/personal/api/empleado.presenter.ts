import { Empleado } from '../domain/empleado';
import { RegimenEmpleado } from '../domain/regimen-empleado';

export interface EmpleadoPublico {
  id: string;
  nombre: string;
  rol: string;
  regimen: RegimenEmpleado;
  activo: boolean;
  importeReferenciaDia?: string;
}

export function toEmpleadoPublico(empleado: Empleado): EmpleadoPublico {
  return {
    id: empleado.id,
    nombre: empleado.nombre,
    rol: empleado.rol,
    regimen: empleado.regimen,
    activo: empleado.activo,
    importeReferenciaDia: empleado.importeReferenciaDia?.toString(),
  };
}
