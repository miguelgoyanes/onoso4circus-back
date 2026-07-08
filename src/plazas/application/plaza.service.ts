import { randomUUID } from 'crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Plaza } from '../domain/plaza';
import { TipoPlaza } from '../domain/tipo-plaza';
import { PLAZA_REPOSITORY } from './plaza.repository';
import type { PlazaRepository } from './plaza.repository';

@Injectable()
export class PlazaService {
  constructor(@Inject(PLAZA_REPOSITORY) private readonly repository: PlazaRepository) {}

  public async crear(
    nombre: string,
    ubicacion: string,
    tipoPlaza: TipoPlaza = TipoPlaza.CON_CIRCO,
  ): Promise<Plaza> {
    const plaza = new Plaza(randomUUID(), nombre, ubicacion, tipoPlaza);
    await this.repository.save(plaza);
    return plaza;
  }

  public async listar(): Promise<Plaza[]> {
    return this.repository.findAll();
  }

  public async obtener(id: string): Promise<Plaza> {
    return this.buscarOFallar(id);
  }

  public async actualizar(
    id: string,
    nombre: string,
    ubicacion: string,
    tipoPlaza?: TipoPlaza,
  ): Promise<Plaza> {
    const plaza = await this.buscarOFallar(id);
    const actualizada = plaza.conDatos(nombre, ubicacion, tipoPlaza ?? plaza.tipoPlaza);
    await this.repository.save(actualizada);
    return actualizada;
  }

  public async eliminar(id: string): Promise<void> {
    await this.buscarOFallar(id);
    await this.repository.delete(id);
  }

  private async buscarOFallar(id: string): Promise<Plaza> {
    const plaza = await this.repository.findById(id);
    if (!plaza) {
      throw new NotFoundException('Plaza no encontrada');
    }
    return plaza;
  }
}
