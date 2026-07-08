import { randomUUID } from 'crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { Empleado } from '../domain/empleado';
import { RegimenEmpleado } from '../domain/regimen-empleado';
import { EMPLEADO_REPOSITORY } from './empleado.repository';
import type { EmpleadoRepository } from './empleado.repository';

@Injectable()
export class EmpleadoService {
  constructor(@Inject(EMPLEADO_REPOSITORY) private readonly repository: EmpleadoRepository) {}

  public async crear(
    nombre: string,
    rol: string,
    regimen: RegimenEmpleado,
    importeReferenciaDia?: Decimal,
  ): Promise<Empleado> {
    const empleado = new Empleado(randomUUID(), nombre, rol, regimen, true, importeReferenciaDia ?? null);
    await this.repository.save(empleado);
    return empleado;
  }

  public async listar(): Promise<Empleado[]> {
    return this.repository.findAll();
  }

  public async obtener(id: string): Promise<Empleado> {
    return this.buscarOFallar(id);
  }

  public async actualizar(
    id: string,
    nombre: string,
    rol: string,
    regimen: RegimenEmpleado,
    importeReferenciaDia?: Decimal,
  ): Promise<Empleado> {
    const empleado = await this.buscarOFallar(id);
    const actualizado = empleado.conDatos(nombre, rol, regimen, importeReferenciaDia ?? null);
    await this.repository.save(actualizado);
    return actualizado;
  }

  public async desactivar(id: string): Promise<Empleado> {
    const empleado = await this.buscarOFallar(id);
    const actualizado = empleado.desactivado();
    await this.repository.save(actualizado);
    return actualizado;
  }

  public async reactivar(id: string): Promise<Empleado> {
    const empleado = await this.buscarOFallar(id);
    const actualizado = empleado.activado();
    await this.repository.save(actualizado);
    return actualizado;
  }

  private async buscarOFallar(id: string): Promise<Empleado> {
    const empleado = await this.repository.findById(id);
    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }
    return empleado;
  }
}
