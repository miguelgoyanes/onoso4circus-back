import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BODA_CONFIG_ID,
  BodaConfigOrmEntity,
} from '../infrastructure/orm/boda.orm-entities';

export interface DatosConfigBoda {
  fechaLimiteEdicion?: Date | null;
  mensajeWhatsapp?: string;
  urlBaseInvitacion?: string;
  activo?: boolean;
}

@Injectable()
export class BodaConfigService {
  constructor(
    @InjectRepository(BodaConfigOrmEntity)
    private readonly repository: Repository<BodaConfigOrmEntity>,
  ) {}

  // La fila única se crea con valores por defecto la primera vez que se pide.
  public async obtener(): Promise<BodaConfigOrmEntity> {
    const existente = await this.repository.findOneBy({ id: BODA_CONFIG_ID });
    if (existente) return existente;
    return this.repository.save(
      this.repository.create({
        id: BODA_CONFIG_ID,
        fechaLimiteEdicion: null,
        mensajeWhatsapp:
          '¡Hola {nombre}! Tienes una invitación muy especial: {enlace}',
        urlBaseInvitacion: process.env.BODA_URL_BASE ?? 'http://localhost:5174',
        activo: true,
      }),
    );
  }

  public async actualizar(
    datos: DatosConfigBoda,
  ): Promise<BodaConfigOrmEntity> {
    const config = await this.obtener();
    Object.assign(
      config,
      Object.fromEntries(
        Object.entries(datos).filter(([, valor]) => valor !== undefined),
      ),
    );
    return this.repository.save(config);
  }

  public edicionAbierta(
    config: BodaConfigOrmEntity,
    ahora: Date = new Date(),
  ): boolean {
    return (
      config.fechaLimiteEdicion === null ||
      ahora.getTime() <= config.fechaLimiteEdicion.getTime()
    );
  }
}
