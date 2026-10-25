import { createHash, randomUUID } from 'crypto';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CondicionPregunta, TipoPregunta } from '../domain/pregunta';
import type { AmbitoPregunta } from '../domain/pregunta';
import {
  BodaAccesoOrmEntity,
  BodaGrupoOrmEntity,
  BodaInvitadoOrmEntity,
  BodaPersonaOrmEntity,
  BodaRespuestaOrmEntity,
} from '../infrastructure/orm/boda.orm-entities';
import { BodaConfigService } from './boda-config.service';
import { PersonaService } from './persona.service';
import {
  RespuestaEntrada,
  RespuestaService,
  calcularCompletado,
  calcularValores,
  cargarContextoPreguntas,
} from './respuesta.service';

export interface InvitacionPublica {
  // tratamiento: cómo se nombra la invitación entera ("la familia Goyanes"), si se ha puesto.
  invitado: { nombre: string; apellidos: string; tratamiento: string | null };
  // Personas de la invitación (la primera es el titular). nombreLibre: plaza cuyo nombre escribe el invitado.
  personas: {
    id: string;
    nombre: string;
    titular: boolean;
    nombreLibre: boolean;
  }[];
  grupo: { nombre: string; slug: string } | null;
  // Todas las preguntas activas de su grupo, incluidas las condicionadas: el frontend evalúa
  // la condición según va respondiendo.
  preguntas: {
    clave: string;
    texto: string;
    textoPlural: string | null;
    ambito: AmbitoPregunta;
    tipo: TipoPregunta;
    opciones: string[] | null;
    obligatoria: boolean;
    permiteNota: boolean;
    editable: boolean;
    condicion: CondicionPregunta | null;
  }[];
  // Respuestas de la invitación entera, por clave de pregunta.
  respuestas: Record<string, { valor: unknown; nota: string | null }>;
  // Respuestas por persona: id de la persona → clave de pregunta → respuesta.
  respuestasPersona: Record<
    string,
    Record<string, { valor: unknown; nota: string | null }>
  >;
  completado: boolean;
  edicionAbierta: boolean;
  fechaLimiteEdicion: Date | null;
}

@Injectable()
export class InvitacionPublicaService {
  constructor(
    @InjectRepository(BodaInvitadoOrmEntity)
    private readonly repository: Repository<BodaInvitadoOrmEntity>,
    private readonly configService: BodaConfigService,
    private readonly respuestaService: RespuestaService,
    private readonly personaService: PersonaService,
    private readonly dataSource: DataSource,
  ) {}

  // Abrir la invitación cuenta como una apertura.
  public async abrir(
    token: string,
    userAgent: string | undefined,
    ip: string | undefined,
  ): Promise<InvitacionPublica> {
    const invitado = await this.buscarPorToken(token);
    await this.dataSource.manager.insert(BodaAccesoOrmEntity, {
      id: randomUUID(),
      invitadoId: invitado.id,
      userAgent: userAgent?.slice(0, 500) ?? null,
      ipHash: ip ? hashIp(ip) : null,
    });
    return this.construirVista(invitado);
  }

  // La fecha límite se valida aquí, nunca solo en el frontend.
  public async guardar(
    token: string,
    entradas: readonly RespuestaEntrada[],
    nombres: readonly { personaId: string; nombre: string }[] = [],
  ): Promise<InvitacionPublica> {
    const invitado = await this.buscarPorToken(token);
    const config = await this.configService.obtener();
    if (!this.configService.edicionAbierta(config)) {
      throw new ForbiddenException(
        'El plazo para modificar la invitación ha terminado',
      );
    }
    await this.personaService.nombrarPlazas(invitado.id, nombres);
    await this.respuestaService.guardar(
      invitado.id,
      entradas,
      'invitado',
      null,
    );
    return this.construirVista(
      (await this.repository.findOneBy({
        id: invitado.id,
      })) as BodaInvitadoOrmEntity,
    );
  }

  // Token desconocido, invitado desactivado o módulo apagado: el mismo 404, sin pistas.
  private async buscarPorToken(token: string): Promise<BodaInvitadoOrmEntity> {
    const [config, invitado] = await Promise.all([
      this.configService.obtener(),
      this.repository.findOneBy({ token }),
    ]);
    if (!config.activo || !invitado || !invitado.activo)
      throw new NotFoundException('Invitación no encontrada');
    return invitado;
  }

  private async construirVista(
    invitado: BodaInvitadoOrmEntity,
  ): Promise<InvitacionPublica> {
    const manager = this.dataSource.manager;
    const [config, grupo, contexto, respuestas, personas] = await Promise.all([
      this.configService.obtener(),
      manager.findOneBy(BodaGrupoOrmEntity, { id: invitado.grupoId }),
      cargarContextoPreguntas(manager),
      manager.findBy(BodaRespuestaOrmEntity, { invitadoId: invitado.id }),
      manager.find(BodaPersonaOrmEntity, {
        where: { invitadoId: invitado.id },
        order: { orden: 'ASC' },
      }),
    ]);
    const valores = calcularValores(contexto, respuestas);
    const completado = calcularCompletado(
      contexto,
      invitado.grupoId,
      personas.map((p) => p.id),
      valores,
    );
    const clavePorId = new Map(contexto.preguntas.map((p) => [p.id, p.clave]));

    const delGrupo = contexto.preguntas.filter((p) => {
      const grupos = contexto.gruposPorPregunta.get(p.id);
      return (
        p.activa &&
        (!grupos || grupos.size === 0 || grupos.has(invitado.grupoId))
      );
    });

    const porPersona: Record<
      string,
      Record<string, { valor: unknown; nota: string | null }>
    > = {};
    for (const r of respuestas) {
      const clave = clavePorId.get(r.preguntaId);
      if (!clave || !r.personaId) continue;
      (porPersona[r.personaId] ??= {})[clave] = {
        valor: r.valor,
        nota: r.nota,
      };
    }

    return {
      invitado: {
        nombre: invitado.nombre,
        apellidos: invitado.apellidos,
        tratamiento: invitado.tratamiento,
      },
      personas: personas.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        titular: p.titular,
        nombreLibre: p.nombreLibre,
      })),
      grupo: grupo ? { nombre: grupo.nombre, slug: grupo.slug } : null,
      preguntas: delGrupo.map((p) => ({
        clave: p.clave,
        texto: p.texto,
        textoPlural: p.textoPlural,
        ambito: p.ambito,
        tipo: p.tipo,
        opciones: p.opciones,
        obligatoria: p.obligatoria,
        permiteNota: p.permiteNota,
        editable: p.editablePorInvitado,
        condicion: p.condicion,
      })),
      respuestas: Object.fromEntries(
        respuestas
          .filter((r) => !r.personaId && clavePorId.has(r.preguntaId))
          .map((r) => [
            clavePorId.get(r.preguntaId) as string,
            { valor: r.valor, nota: r.nota },
          ]),
      ),
      respuestasPersona: porPersona,
      completado,
      edicionAbierta: this.configService.edicionAbierta(config),
      fechaLimiteEdicion: config.fechaLimiteEdicion,
    };
  }
}

function hashIp(ip: string): string {
  return createHash('sha256')
    .update(`${process.env.BODA_IP_SALT ?? process.env.JWT_SECRET ?? ''}${ip}`)
    .digest('hex')
    .slice(0, 32);
}
