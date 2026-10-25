import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  AmbitoPregunta,
  RespuestaInvalidaError,
  ValoresRespuestas,
  estaCompletado,
  preguntaAplica,
  validarNota,
  validarValor,
  valoresIguales,
} from '../domain/pregunta';
import {
  BodaEventoOrmEntity,
  BodaInvitadoOrmEntity,
  BodaPersonaOrmEntity,
  BodaPreguntaGrupoOrmEntity,
  BodaPreguntaOrmEntity,
  BodaRespuestaOrmEntity,
  OrigenCambio,
  TipoEvento,
} from '../infrastructure/orm/boda.orm-entities';

export interface RespuestaEntrada {
  clave: string;
  // null borra la respuesta: el admin puede con cualquiera; el invitado solo con las no obligatorias.
  valor: unknown;
  // undefined = conservar la nota que ya hubiera.
  nota?: string | null;
  // Obligatorio en las preguntas "por persona"; no debe venir en las de la invitación.
  personaId?: string | null;
}

export interface ContextoPreguntas {
  preguntas: BodaPreguntaOrmEntity[];
  gruposPorPregunta: Map<string, Set<string>>;
  ambitos: Map<string, AmbitoPregunta>;
}

export async function cargarContextoPreguntas(
  manager: EntityManager,
): Promise<ContextoPreguntas> {
  const [preguntas, relaciones] = await Promise.all([
    manager.find(BodaPreguntaOrmEntity, {
      order: { orden: 'ASC', clave: 'ASC' },
    }),
    manager.find(BodaPreguntaGrupoOrmEntity),
  ]);
  const gruposPorPregunta = new Map<string, Set<string>>();
  for (const relacion of relaciones) {
    const grupos =
      gruposPorPregunta.get(relacion.preguntaId) ?? new Set<string>();
    grupos.add(relacion.grupoId);
    gruposPorPregunta.set(relacion.preguntaId, grupos);
  }
  const ambitos = new Map(preguntas.map((p) => [p.clave, p.ambito]));
  return { preguntas, gruposPorPregunta, ambitos };
}

export function calcularValores(
  contexto: ContextoPreguntas,
  respuestas: readonly BodaRespuestaOrmEntity[],
): ValoresRespuestas {
  const preguntaPorId = new Map(contexto.preguntas.map((p) => [p.id, p]));
  const valores: ValoresRespuestas = { invitacion: {}, personas: {} };
  for (const respuesta of respuestas) {
    const pregunta = preguntaPorId.get(respuesta.preguntaId);
    if (!pregunta) continue;
    asignar(valores, pregunta.clave, respuesta.personaId, respuesta.valor);
  }
  return valores;
}

function asignar(
  valores: ValoresRespuestas,
  clave: string,
  personaId: string,
  valor: unknown,
): void {
  if (personaId) {
    (valores.personas[personaId] ??= {})[clave] = valor;
  } else {
    valores.invitacion[clave] = valor;
  }
}

function quitar(
  valores: ValoresRespuestas,
  clave: string,
  personaId: string,
): void {
  if (personaId) {
    delete valores.personas[personaId]?.[clave];
  } else {
    delete valores.invitacion[clave];
  }
}

// ¿Le aplica esta pregunta a esta invitación (o a esta persona)? Grupo, activa y condición.
export function aplicaPregunta(
  contexto: ContextoPreguntas,
  grupoId: string,
  valores: ValoresRespuestas,
  pregunta: BodaPreguntaOrmEntity,
  personaId: string | null,
): boolean {
  return preguntaAplica(
    pregunta,
    grupoId,
    contexto.gruposPorPregunta.get(pregunta.id) ?? new Set<string>(),
    valores,
    personaId,
    contexto.ambitos,
  );
}

// Completada = todas las obligatorias que aplican están respondidas (por cada persona, si son por persona).
export function calcularCompletado(
  contexto: ContextoPreguntas,
  grupoId: string,
  personaIds: readonly string[],
  valores: ValoresRespuestas,
): boolean {
  const porClave = new Map(contexto.preguntas.map((p) => [p.clave, p]));
  return estaCompletado(
    contexto.preguntas,
    personaIds,
    valores,
    (pregunta, personaId) =>
      aplicaPregunta(
        contexto,
        grupoId,
        valores,
        porClave.get(pregunta.clave) as BodaPreguntaOrmEntity,
        personaId,
      ),
  );
}

@Injectable()
export class RespuestaService {
  constructor(private readonly dataSource: DataSource) {}

  // Guarda las respuestas en bloque (todo o nada) y deja constancia de cada cambio en boda_eventos.
  // Las del invitado exigen que la pregunta le aplique; el admin puede tocar cualquiera.
  public async guardar(
    invitadoId: string,
    entradas: readonly RespuestaEntrada[],
    origen: OrigenCambio,
    usuarioId: string | null,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const invitado = await manager.findOneByOrFail(BodaInvitadoOrmEntity, {
        id: invitadoId,
      });
      const [contexto, existentes, personas] = await Promise.all([
        cargarContextoPreguntas(manager),
        manager.findBy(BodaRespuestaOrmEntity, { invitadoId }),
        manager.findBy(BodaPersonaOrmEntity, { invitadoId }),
      ]);
      const personaIds = new Set(personas.map((p) => p.id));
      const clavePar = (preguntaId: string, personaId: string) =>
        `${preguntaId}|${personaId}`;
      const existentePorPar = new Map(
        existentes.map((r) => [clavePar(r.preguntaId, r.personaId), r]),
      );
      const preguntaPorClave = new Map(
        contexto.preguntas.map((p) => [p.clave, p]),
      );

      const valores = calcularValores(contexto, existentes);
      const cambios: {
        pregunta: BodaPreguntaOrmEntity;
        personaId: string;
        valor: unknown;
        nota: string | null;
      }[] = [];

      for (const entrada of entradas) {
        const pregunta = preguntaPorClave.get(entrada.clave);
        if (!pregunta || !pregunta.activa)
          throw new BadRequestException(
            `Pregunta desconocida: ${entrada.clave}`,
          );
        const personaId = entrada.personaId ?? '';
        if (pregunta.ambito === 'persona') {
          if (!personaId || !personaIds.has(personaId))
            throw new BadRequestException(
              `La pregunta ${pregunta.clave} necesita una persona de esta invitación`,
            );
        } else if (personaId) {
          throw new BadRequestException(
            `La pregunta ${pregunta.clave} no es por persona`,
          );
        }
        const anterior = existentePorPar.get(clavePar(pregunta.id, personaId));

        if (entrada.valor === null) {
          if (origen !== 'admin' && pregunta.obligatoria)
            throw new BadRequestException(
              `Falta la respuesta a ${entrada.clave}`,
            );
          quitar(valores, pregunta.clave, personaId);
          cambios.push({ pregunta, personaId, valor: null, nota: null });
          continue;
        }

        let valor: unknown;
        let nota: string | null;
        try {
          valor = validarValor(pregunta, entrada.valor);
          nota =
            entrada.nota === undefined
              ? (anterior?.nota ?? null)
              : validarNota(entrada.nota);
        } catch (error) {
          if (error instanceof RespuestaInvalidaError)
            throw new BadRequestException(error.message);
          throw error;
        }
        if (nota !== null && !pregunta.permiteNota) {
          throw new BadRequestException(
            `La pregunta ${pregunta.clave} no admite nota`,
          );
        }
        if (
          origen === 'invitado' &&
          !pregunta.editablePorInvitado &&
          anterior &&
          !valoresIguales(anterior.valor, valor)
        ) {
          throw new ForbiddenException(
            `La respuesta a ${pregunta.clave} ya no se puede cambiar`,
          );
        }
        asignar(valores, pregunta.clave, personaId, valor);
        cambios.push({ pregunta, personaId, valor, nota });
      }

      if (origen === 'invitado') {
        // Se comprueba con los valores ya fusionados: una pregunta condicionada (p. ej. alergias de
        // quien asiste) puede llegar en el mismo envío que la que la activa.
        for (const { pregunta, personaId, valor } of cambios) {
          if (valor === null) continue;
          const aplica = aplicaPregunta(
            contexto,
            invitado.grupoId,
            valores,
            pregunta,
            personaId || null,
          );
          if (!aplica)
            throw new BadRequestException(
              `La pregunta ${pregunta.clave} no corresponde a esta invitación`,
            );
        }
      }

      const evento = (
        tipo: TipoEvento,
        preguntaId: string | null,
        personaId: string | null,
        anterior: unknown,
        nuevo: unknown,
      ) =>
        manager.save(BodaEventoOrmEntity, {
          id: randomUUID(),
          invitadoId,
          tipo,
          preguntaId,
          personaId,
          valorAnterior: anterior,
          valorNuevo: nuevo,
          origen,
          usuarioId,
        });

      for (const { pregunta, personaId, valor, nota } of cambios) {
        const anterior = existentePorPar.get(clavePar(pregunta.id, personaId));
        const resumenAnterior = anterior
          ? { valor: anterior.valor, nota: anterior.nota }
          : null;
        const personaEvento = personaId || null;

        if (valor === null) {
          if (!anterior) continue;
          await manager.delete(BodaRespuestaOrmEntity, { id: anterior.id });
          await evento(
            'respuesta_eliminada',
            pregunta.id,
            personaEvento,
            resumenAnterior,
            null,
          );
          continue;
        }
        if (
          anterior &&
          valoresIguales(anterior.valor, valor) &&
          (anterior.nota ?? null) === nota
        )
          continue;

        await manager.save(BodaRespuestaOrmEntity, {
          id: anterior?.id ?? randomUUID(),
          invitadoId,
          preguntaId: pregunta.id,
          personaId,
          valor,
          nota,
          origen,
        });
        await evento(
          anterior ? 'respuesta_modificada' : 'respuesta_creada',
          pregunta.id,
          personaEvento,
          resumenAnterior,
          { valor, nota },
        );
      }

      const completado = calcularCompletado(
        contexto,
        invitado.grupoId,
        [...personaIds],
        valores,
      );
      if (completado && !invitado.completadoEn) {
        await manager.update(
          BodaInvitadoOrmEntity,
          { id: invitadoId },
          { completadoEn: new Date() },
        );
        await evento('completado', null, null, null, null);
      }
    });
  }
}
