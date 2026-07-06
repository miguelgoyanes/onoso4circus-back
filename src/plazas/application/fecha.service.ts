import { randomUUID } from 'crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Fecha } from '../domain/fecha';
import { TipoActividad } from '../domain/tipo-actividad';
import { FECHA_REPOSITORY } from './fecha.repository';
import type { FechaRepository } from './fecha.repository';
import { PLAZA_REPOSITORY } from './plaza.repository';
import type { PlazaRepository } from './plaza.repository';

@Injectable()
export class FechaService {
  constructor(
    @Inject(FECHA_REPOSITORY) private readonly repository: FechaRepository,
    @Inject(PLAZA_REPOSITORY) private readonly plazaRepository: PlazaRepository,
  ) {}

  public async crear(
    plazaId: string,
    fecha: Date,
    tipoActividad: TipoActividad,
  ): Promise<Fecha> {
    const plaza = await this.plazaRepository.findById(plazaId);
    if (!plaza) {
      throw new NotFoundException('La plaza indicada no existe');
    }

    const nuevaFecha = new Fecha(randomUUID(), plazaId, fecha, tipoActividad);
    await this.repository.save(nuevaFecha);
    return nuevaFecha;
  }

  public async listarPorPlaza(plazaId: string): Promise<Fecha[]> {
    return this.repository.findByPlaza(plazaId);
  }

  public async obtener(id: string): Promise<Fecha> {
    return this.buscarOFallar(id);
  }

  public async actualizar(
    id: string,
    fecha: Date,
    tipoActividad: TipoActividad,
  ): Promise<Fecha> {
    const actual = await this.buscarOFallar(id);
    const actualizada = actual.conDatos(fecha, tipoActividad);
    await this.repository.save(actualizada);
    return actualizada;
  }

  public async eliminar(id: string): Promise<void> {
    await this.buscarOFallar(id);
    await this.repository.delete(id);
  }

  private async buscarOFallar(id: string): Promise<Fecha> {
    const fecha = await this.repository.findById(id);
    if (!fecha) {
      throw new NotFoundException('Fecha no encontrada');
    }
    return fecha;
  }
}
