import { Empleado } from '../domain/empleado';

export interface EmpleadoRepository {
  save(empleado: Empleado): Promise<void>;
  findById(id: string): Promise<Empleado | null>;
  findAll(): Promise<Empleado[]>;
}

export const EMPLEADO_REPOSITORY = Symbol('EMPLEADO_REPOSITORY');
