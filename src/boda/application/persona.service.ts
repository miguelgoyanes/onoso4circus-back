import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import {
  BodaInvitadoOrmEntity,
  BodaPersonaOrmEntity,
  BodaPreguntaOrmEntity,
  BodaRespuestaOrmEntity,
} from '../infrastructure/orm/boda.orm-entities';

// Crea la fila de una persona (sin guardarla). Sin nombre = plaza cuyo nombre escribe el invitado.
export function nuevaPersona(
  invitadoId: string,
  nombre: string,
  orden: number,
  titular: boolean,
): BodaPersonaOrmEntity {
  return Object.assign(new BodaPersonaOrmEntity(), {
    id: randomUUID(),
    invitadoId,
    nombre: nombre.trim(),
    nombreLibre: nombre.trim() === '',
    orden,
    titular,
  });
}

// Guarda el titular y los acompañantes (o la familia) de una invitación recién creada.
export async function guardarPersonas(
  manager: EntityManager,
  invitadoId: string,
  nombreTitular: string,
  otras: readonly string[] = [],
): Promise<void> {
  // "?" = plaza sin nombre (el invitado lo escribe).
  const nombres = otras
    .map((n) => n.trim())
    .filter((n) => n.length > 0)
    .map((n) => (n === '?' ? '' : n));
  await manager.save([
    nuevaPersona(invitadoId, nombreTitular, 0, true),
    ...nombres.map((n, i) => nuevaPersona(invitadoId, n, i + 1, false)),
  ]);
}

@Injectable()
export class PersonaService implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  // Pone al día los datos anteriores a las personas (idempotente): toda invitación tiene un titular
  // y las respuestas "por persona" que quedaron sin persona pasan a ser del titular.
  public async onModuleInit(): Promise<void> {
    await this.migrar();
  }

  public async migrar(): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const [invitados, personas] = await Promise.all([
        manager.find(BodaInvitadoOrmEntity),
        manager.find(BodaPersonaOrmEntity),
      ]);
      const conPersonas = new Set(personas.map((p) => p.invitadoId));
      const nuevas = invitados
        .filter((i) => !conPersonas.has(i.id))
        .map((i) => nuevaPersona(i.id, i.nombre, 0, true));
      if (nuevas.length > 0) await manager.save(nuevas);

      const titularPorInvitado = new Map(
        [...personas, ...nuevas]
          .filter((p) => p.titular)
          .map((p) => [p.invitadoId, p.id]),
      );
      const preguntasPorPersona = await manager.find(BodaPreguntaOrmEntity, {
        where: { ambito: 'persona' },
      });
      if (preguntasPorPersona.length === 0) return;
      const huerfanas = await manager.find(BodaRespuestaOrmEntity, {
        where: {
          personaId: '',
          preguntaId: In(preguntasPorPersona.map((p) => p.id)),
        },
      });
      for (const respuesta of huerfanas) {
        const titular = titularPorInvitado.get(respuesta.invitadoId);
        if (titular)
          await manager.update(
            BodaRespuestaOrmEntity,
            { id: respuesta.id },
            { personaId: titular },
          );
      }
    });
  }

  public async crear(
    invitadoId: string,
    nombre: string,
  ): Promise<BodaPersonaOrmEntity> {
    await this.exigirInvitado(invitadoId);
    const existentes = await this.dataSource.manager.findBy(
      BodaPersonaOrmEntity,
      { invitadoId },
    );
    const orden = existentes.reduce((max, p) => Math.max(max, p.orden), -1) + 1;
    return this.dataSource.manager.save(
      nuevaPersona(invitadoId, nombre, orden, false),
    );
  }

  public async renombrar(
    invitadoId: string,
    personaId: string,
    nombre: string,
  ): Promise<void> {
    const persona = await this.exigirPersona(invitadoId, personaId);
    persona.nombre = nombre.trim();
    // Si se le pone nombre desde aquí deja de ser una plaza libre; dejarlo vacío la vuelve libre.
    persona.nombreLibre = !persona.titular && persona.nombre === '';
    await this.dataSource.manager.save(persona);
  }

  // El invitado escribe el nombre de sus plazas libres (solo de esas y solo de su invitación).
  public async nombrarPlazas(
    invitadoId: string,
    nombres: readonly { personaId: string; nombre: string }[],
  ): Promise<void> {
    if (nombres.length === 0) return;
    const libres = new Map(
      (
        await this.dataSource.manager.findBy(BodaPersonaOrmEntity, {
          invitadoId,
          nombreLibre: true,
        })
      ).map((p) => [p.id, p]),
    );
    for (const { personaId, nombre } of nombres) {
      const persona = libres.get(personaId);
      if (!persona)
        throw new BadRequestException(
          'Esa persona no se puede nombrar desde la invitación',
        );
      persona.nombre = nombre.trim();
    }
    await this.dataSource.manager.save([...libres.values()]);
  }

  // Quita a una persona (no al titular) y sus respuestas; su rastro en el historial se conserva.
  public async eliminar(invitadoId: string, personaId: string): Promise<void> {
    const persona = await this.exigirPersona(invitadoId, personaId);
    if (persona.titular)
      throw new BadRequestException(
        'No se puede quitar a la persona titular de la invitación',
      );
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(BodaRespuestaOrmEntity, { invitadoId, personaId });
      await manager.delete(BodaPersonaOrmEntity, { id: personaId });
    });
  }

  private async exigirInvitado(invitadoId: string): Promise<void> {
    if (
      !(await this.dataSource.manager.findOneBy(BodaInvitadoOrmEntity, {
        id: invitadoId,
      }))
    )
      throw new NotFoundException('Invitado no encontrado');
  }

  private async exigirPersona(
    invitadoId: string,
    personaId: string,
  ): Promise<BodaPersonaOrmEntity> {
    const persona = await this.dataSource.manager.findOneBy(
      BodaPersonaOrmEntity,
      { id: personaId, invitadoId },
    );
    if (!persona) throw new NotFoundException('Persona no encontrada');
    return persona;
  }
}
