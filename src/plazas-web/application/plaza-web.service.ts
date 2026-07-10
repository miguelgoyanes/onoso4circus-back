import { randomUUID } from 'crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PlazaWeb } from '../domain/plaza-web';
import { TipoVenta } from '../domain/tipo-venta';
import { PLAZA_WEB_REPOSITORY } from './plaza-web.repository';
import type { PlazaWebRepository } from './plaza-web.repository';
import { PlazaService } from '../../plazas/application/plaza.service';

export interface DatosPlazaWeb {
  ciudad: string;
  ubicacion: string;
  mapsUrl: string;
  descripcion?: string | null;
  entradasUrl: string;
  venta: TipoVenta;
  horasAntes?: number | null;
  plazaId?: string | null;
}

@Injectable()
export class PlazaWebService {
  constructor(
    @Inject(PLAZA_WEB_REPOSITORY) private readonly repository: PlazaWebRepository,
    private readonly plazaService: PlazaService,
  ) {}

  public async crear(datos: DatosPlazaWeb): Promise<PlazaWeb> {
    await this.validarPlazaVinculada(datos.plazaId);
    const plazaWeb = new PlazaWeb({ id: randomUUID(), ...datos });
    await this.repository.save(plazaWeb);
    return plazaWeb;
  }

  public async listar(): Promise<PlazaWeb[]> {
    return this.repository.findAll();
  }

  public async obtener(id: string): Promise<PlazaWeb> {
    return this.buscarOFallar(id);
  }

  public async actualizar(id: string, datos: DatosPlazaWeb): Promise<PlazaWeb> {
    await this.validarPlazaVinculada(datos.plazaId);
    const plazaWeb = await this.buscarOFallar(id);
    const actualizada = plazaWeb.conDatos(datos);
    await this.repository.save(actualizada);
    return actualizada;
  }

  public async actualizarCartel(id: string, cartelUrl: string): Promise<PlazaWeb> {
    const plazaWeb = await this.buscarOFallar(id);
    const actualizada = plazaWeb.conCartel(cartelUrl);
    await this.repository.save(actualizada);
    return actualizada;
  }

  public async eliminar(id: string): Promise<void> {
    await this.buscarOFallar(id);
    await this.repository.delete(id);
  }

  private async validarPlazaVinculada(plazaId?: string | null): Promise<void> {
    if (!plazaId) return;
    await this.plazaService.obtener(plazaId);
  }

  private async buscarOFallar(id: string): Promise<PlazaWeb> {
    const plazaWeb = await this.repository.findById(id);
    if (!plazaWeb) {
      throw new NotFoundException('Plaza web no encontrada');
    }
    return plazaWeb;
  }
}
