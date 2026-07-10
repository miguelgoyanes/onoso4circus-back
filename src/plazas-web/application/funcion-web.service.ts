import { randomUUID } from 'crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FuncionWeb } from '../domain/funcion-web';
import { FUNCION_WEB_REPOSITORY } from './funcion-web.repository';
import type { FuncionWebRepository } from './funcion-web.repository';
import { PLAZA_WEB_REPOSITORY } from './plaza-web.repository';
import type { PlazaWebRepository } from './plaza-web.repository';

@Injectable()
export class FuncionWebService {
  constructor(
    @Inject(FUNCION_WEB_REPOSITORY) private readonly repository: FuncionWebRepository,
    @Inject(PLAZA_WEB_REPOSITORY) private readonly plazaWebRepository: PlazaWebRepository,
  ) {}

  public async crear(
    plazaWebId: string,
    fecha: Date,
    horarios: string[],
    descuento?: number | null,
    descuentoDescripcion?: string | null,
  ): Promise<FuncionWeb> {
    const plazaWeb = await this.plazaWebRepository.findById(plazaWebId);
    if (!plazaWeb) {
      throw new NotFoundException('La plaza web indicada no existe');
    }

    const funcionWeb = new FuncionWeb(
      randomUUID(),
      plazaWebId,
      fecha,
      horarios,
      descuento ?? null,
      descuentoDescripcion ?? null,
    );
    await this.repository.save(funcionWeb);
    return funcionWeb;
  }

  public async listarPorPlazaWeb(plazaWebId: string): Promise<FuncionWeb[]> {
    return this.repository.findByPlazaWeb(plazaWebId);
  }

  public async obtener(id: string): Promise<FuncionWeb> {
    return this.buscarOFallar(id);
  }

  public async actualizar(
    id: string,
    fecha: Date,
    horarios: string[],
    descuento?: number | null,
    descuentoDescripcion?: string | null,
  ): Promise<FuncionWeb> {
    const actual = await this.buscarOFallar(id);
    const actualizada = actual.conDatos(fecha, horarios, descuento ?? null, descuentoDescripcion ?? null);
    await this.repository.save(actualizada);
    return actualizada;
  }

  public async eliminar(id: string): Promise<void> {
    await this.buscarOFallar(id);
    await this.repository.delete(id);
  }

  private async buscarOFallar(id: string): Promise<FuncionWeb> {
    const funcionWeb = await this.repository.findById(id);
    if (!funcionWeb) {
      throw new NotFoundException('Función web no encontrada');
    }
    return funcionWeb;
  }
}
