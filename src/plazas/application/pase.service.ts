import { randomUUID } from 'crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pase } from '../domain/pase';
import { PASE_REPOSITORY } from './pase.repository';
import type { PaseRepository } from './pase.repository';
import { FECHA_REPOSITORY } from './fecha.repository';
import type { FechaRepository } from './fecha.repository';

@Injectable()
export class PaseService {
  constructor(
    @Inject(PASE_REPOSITORY) private readonly repository: PaseRepository,
    @Inject(FECHA_REPOSITORY) private readonly fechaRepository: FechaRepository,
  ) {}

  public async crear(fechaId: string, hora: string, nombre?: string): Promise<Pase> {
    const fecha = await this.fechaRepository.findById(fechaId);
    if (!fecha) {
      throw new NotFoundException('La fecha indicada no existe');
    }

    const pase = new Pase(randomUUID(), fechaId, hora, nombre);
    await this.repository.save(pase);
    return pase;
  }

  public async listarPorFecha(fechaId: string): Promise<Pase[]> {
    return this.repository.findByFecha(fechaId);
  }

  public async obtener(id: string): Promise<Pase> {
    return this.buscarOFallar(id);
  }

  public async actualizar(id: string, hora: string, nombre?: string): Promise<Pase> {
    const actual = await this.buscarOFallar(id);
    const actualizado = actual.conDatos(hora, nombre);
    await this.repository.save(actualizado);
    return actualizado;
  }

  public async eliminar(id: string): Promise<void> {
    await this.buscarOFallar(id);
    await this.repository.delete(id);
  }

  private async buscarOFallar(id: string): Promise<Pase> {
    const pase = await this.repository.findById(id);
    if (!pase) {
      throw new NotFoundException('Pase no encontrado');
    }
    return pase;
  }
}
