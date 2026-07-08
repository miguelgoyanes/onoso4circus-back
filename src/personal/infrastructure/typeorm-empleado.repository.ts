import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Empleado } from '../domain/empleado';
import { EmpleadoRepository } from '../application/empleado.repository';
import { EmpleadoOrmEntity } from './orm/empleado.orm-entity';

function toDomain(orm: EmpleadoOrmEntity): Empleado {
  return new Empleado(orm.id, orm.nombre, orm.rol, orm.regimen, orm.activo, orm.importeReferenciaDia);
}

@Injectable()
export class TypeOrmEmpleadoRepository implements EmpleadoRepository {
  constructor(
    @InjectRepository(EmpleadoOrmEntity)
    private readonly repo: Repository<EmpleadoOrmEntity>,
  ) {}

  public async save(empleado: Empleado): Promise<void> {
    await this.repo.save({
      id: empleado.id,
      nombre: empleado.nombre,
      rol: empleado.rol,
      regimen: empleado.regimen,
      activo: empleado.activo,
      importeReferenciaDia: empleado.importeReferenciaDia,
    });
  }

  public async findById(id: string): Promise<Empleado | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findAll(): Promise<Empleado[]> {
    const empleados = await this.repo.find({ order: { nombre: 'ASC' } });
    return empleados.map(toDomain);
  }
}
