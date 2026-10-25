export enum TipoPregunta {
  TEXTO = 'texto',
  TEXTO_LARGO = 'texto_largo',
  SI_NO = 'si_no',
  OPCION = 'opcion',
  MULTIOPCION = 'multiopcion',
  NUMERO = 'numero',
  FECHA = 'fecha',
}

// La pregunta solo se muestra/exige si la respuesta a otra pregunta (por clave) es igual a este valor.
export interface CondicionPregunta {
  clave: string;
  igual: unknown;
}

// 'invitacion' = una respuesta por invitación; 'persona' = una respuesta por cada persona invitada
// (p. ej. asistencia, nombre artístico, alergias).
export type AmbitoPregunta = 'invitacion' | 'persona';

export interface PreguntaDeDominio {
  clave: string;
  tipo: TipoPregunta;
  opciones: string[] | null;
  obligatoria: boolean;
  activa: boolean;
  condicion: CondicionPregunta | null;
  ambito: AmbitoPregunta;
}

// Valores vigentes de una invitación: los de la invitación y, aparte, los de cada persona (por id).
export interface ValoresRespuestas {
  invitacion: Record<string, unknown>;
  personas: Record<string, Record<string, unknown>>;
}

const LONGITUD_MAXIMA_TEXTO = 200;
const LONGITUD_MAXIMA_TEXTO_LARGO = 4000;
const LONGITUD_MAXIMA_NOTA = 2000;

export class RespuestaInvalidaError extends Error {}

export function validarNota(nota: unknown): string | null {
  if (nota === undefined || nota === null || nota === '') return null;
  if (typeof nota !== 'string' || nota.length > LONGITUD_MAXIMA_NOTA) {
    throw new RespuestaInvalidaError(
      `La nota debe ser texto de como mucho ${LONGITUD_MAXIMA_NOTA} caracteres`,
    );
  }
  return nota;
}

// Devuelve el valor normalizado (p. ej. texto recortado) o lanza RespuestaInvalidaError.
export function validarValor(
  pregunta: Pick<PreguntaDeDominio, 'clave' | 'tipo' | 'opciones'>,
  valor: unknown,
): unknown {
  const falla = (motivo: string): never => {
    throw new RespuestaInvalidaError(
      `Respuesta no válida para "${pregunta.clave}": ${motivo}`,
    );
  };

  switch (pregunta.tipo) {
    case TipoPregunta.TEXTO:
    case TipoPregunta.TEXTO_LARGO: {
      if (typeof valor !== 'string') return falla('debe ser texto');
      const texto = valor.trim();
      const maximo =
        pregunta.tipo === TipoPregunta.TEXTO
          ? LONGITUD_MAXIMA_TEXTO
          : LONGITUD_MAXIMA_TEXTO_LARGO;
      if (texto.length === 0) return falla('no puede estar vacía');
      if (texto.length > maximo) return falla(`máximo ${maximo} caracteres`);
      return texto;
    }
    case TipoPregunta.SI_NO:
      if (typeof valor !== 'boolean') return falla('debe ser sí o no');
      return valor;
    case TipoPregunta.OPCION:
      if (
        typeof valor !== 'string' ||
        !(pregunta.opciones ?? []).includes(valor)
      )
        return falla('opción desconocida');
      return valor;
    case TipoPregunta.MULTIOPCION: {
      if (!Array.isArray(valor) || valor.some((v) => typeof v !== 'string'))
        return falla('debe ser una lista de opciones');
      const opciones = pregunta.opciones ?? [];
      if (valor.some((v: string) => !opciones.includes(v)))
        return falla('opción desconocida');
      return Array.from(new Set(valor as string[]));
    }
    case TipoPregunta.NUMERO:
      if (typeof valor !== 'number' || !Number.isFinite(valor))
        return falla('debe ser un número');
      return valor;
    case TipoPregunta.FECHA:
      if (
        typeof valor !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(valor) ||
        Number.isNaN(Date.parse(valor))
      ) {
        return falla('debe ser una fecha AAAA-MM-DD');
      }
      return valor;
  }
}

export function tieneValor(valor: unknown): boolean {
  if (valor === undefined || valor === null || valor === '') return false;
  if (Array.isArray(valor)) return valor.length > 0;
  return true;
}

export function valoresIguales(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Evalúa la condición de la pregunta:
// - referencia a una pregunta de la invitación: se compara ese valor;
// - pregunta por persona que referencia otra por persona: se compara la de esa misma persona;
// - pregunta de la invitación que referencia una por persona: basta con que alguna persona lo cumpla.
function condicionSeCumple(
  pregunta: PreguntaDeDominio,
  personaId: string | null,
  valores: ValoresRespuestas,
  ambitos: ReadonlyMap<string, AmbitoPregunta>,
): boolean {
  const condicion = pregunta.condicion;
  if (!condicion) return true;
  if ((ambitos.get(condicion.clave) ?? 'invitacion') === 'invitacion') {
    return valoresIguales(valores.invitacion[condicion.clave], condicion.igual);
  }
  if (pregunta.ambito === 'persona' && personaId) {
    return valoresIguales(
      valores.personas[personaId]?.[condicion.clave],
      condicion.igual,
    );
  }
  return Object.values(valores.personas).some((v) =>
    valoresIguales(v[condicion.clave], condicion.igual),
  );
}

// ¿Se le hace esta pregunta a esta invitación (o a esta persona, si es por persona)?
// `gruposDePregunta` vacío = vale para todos los grupos.
export function preguntaAplica(
  pregunta: PreguntaDeDominio,
  grupoId: string,
  gruposDePregunta: ReadonlySet<string>,
  valores: ValoresRespuestas,
  personaId: string | null,
  ambitos: ReadonlyMap<string, AmbitoPregunta>,
): boolean {
  if (!pregunta.activa) return false;
  if (gruposDePregunta.size > 0 && !gruposDePregunta.has(grupoId)) return false;
  return condicionSeCumple(pregunta, personaId, valores, ambitos);
}

// Completado = todas las preguntas obligatorias que aplican tienen respuesta: una por invitación
// o, si son por persona, una por cada persona a la que le aplican.
export function estaCompletado(
  preguntas: readonly PreguntaDeDominio[],
  personaIds: readonly string[],
  valores: ValoresRespuestas,
  aplica: (pregunta: PreguntaDeDominio, personaId: string | null) => boolean,
): boolean {
  return preguntas
    .filter((p) => p.obligatoria)
    .every((p) => {
      if (p.ambito === 'invitacion') {
        return !aplica(p, null) || tieneValor(valores.invitacion[p.clave]);
      }
      return personaIds.every(
        (id) => !aplica(p, id) || tieneValor(valores.personas[id]?.[p.clave]),
      );
    });
}
