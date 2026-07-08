import Decimal from 'decimal.js';
import { RegimenEmpleado } from './regimen-empleado';

export class Empleado {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
    public readonly rol: string,
    public readonly regimen: RegimenEmpleado,
    public readonly activo: boolean = true,
    public readonly importeReferenciaDia: Decimal | null = null,
  ) {}

  public conDatos(
    nombre: string,
    rol: string,
    regimen: RegimenEmpleado,
    importeReferenciaDia: Decimal | null,
  ): Empleado {
    return new Empleado(this.id, nombre, rol, regimen, this.activo, importeReferenciaDia);
  }

  public desactivado(): Empleado {
    return new Empleado(this.id, this.nombre, this.rol, this.regimen, false, this.importeReferenciaDia);
  }

  public activado(): Empleado {
    return new Empleado(this.id, this.nombre, this.rol, this.regimen, true, this.importeReferenciaDia);
  }
}
