import {
  construirEnlace,
  construirMensaje,
  construirUrlWhatsapp,
  generarToken,
  normalizarTelefono,
  unirNombres,
} from './enlace';
import {
  PreguntaDeDominio,
  RespuestaInvalidaError,
  TipoPregunta,
  estaCompletado,
  preguntaAplica,
  validarValor,
} from './pregunta';

function pregunta(
  parcial: Partial<PreguntaDeDominio> & { clave: string },
): PreguntaDeDominio {
  return {
    tipo: TipoPregunta.TEXTO,
    opciones: null,
    obligatoria: true,
    activa: true,
    condicion: null,
    ambito: 'invitacion',
    ...parcial,
  };
}

describe('validarValor', () => {
  it('recorta el texto y rechaza vacío', () => {
    const p = pregunta({ clave: 'nombre_artistico' });
    expect(validarValor(p, '  El Gran Brandi  ')).toBe('El Gran Brandi');
    expect(() => validarValor(p, '   ')).toThrow(RespuestaInvalidaError);
    expect(() => validarValor(p, 3)).toThrow(RespuestaInvalidaError);
  });

  it('exige boolean en sí/no y opciones conocidas', () => {
    expect(
      validarValor(pregunta({ clave: 'a', tipo: TipoPregunta.SI_NO }), false),
    ).toBe(false);
    expect(() =>
      validarValor(pregunta({ clave: 'a', tipo: TipoPregunta.SI_NO }), 'si'),
    ).toThrow(RespuestaInvalidaError);
    const opcion = pregunta({
      clave: 'd',
      tipo: TipoPregunta.OPCION,
      opciones: ['A', 'B'],
    });
    expect(validarValor(opcion, 'A')).toBe('A');
    expect(() => validarValor(opcion, 'C')).toThrow(RespuestaInvalidaError);
  });

  it('multiopción: subconjunto sin duplicados', () => {
    const p = pregunta({
      clave: 'm',
      tipo: TipoPregunta.MULTIOPCION,
      opciones: ['A', 'B', 'C'],
    });
    expect(validarValor(p, ['A', 'A', 'C'])).toEqual(['A', 'C']);
    expect(() => validarValor(p, ['Z'])).toThrow(RespuestaInvalidaError);
  });
});

describe('preguntaAplica y estaCompletado', () => {
  const vacio = { invitacion: {}, personas: {} };
  const asistencia = pregunta({
    clave: 'asistencia',
    tipo: TipoPregunta.SI_NO,
    ambito: 'persona',
  });
  const apodo = pregunta({
    clave: 'apodo',
    ambito: 'persona',
    condicion: { clave: 'asistencia', igual: true },
  });
  const dress = pregunta({
    clave: 'dress',
    condicion: { clave: 'asistencia', igual: true },
  });
  const ambitos = new Map<string, 'invitacion' | 'persona'>([
    ['asistencia', 'persona'],
    ['apodo', 'persona'],
    ['dress', 'invitacion'],
  ]);

  it('respeta grupos y activa', () => {
    expect(
      preguntaAplica(asistencia, 'g1', new Set(), vacio, 'a', ambitos),
    ).toBe(true);
    expect(
      preguntaAplica(asistencia, 'g1', new Set(['g2']), vacio, 'a', ambitos),
    ).toBe(false);
    expect(
      preguntaAplica(
        { ...asistencia, activa: false },
        'g1',
        new Set(),
        vacio,
        'a',
        ambitos,
      ),
    ).toBe(false);
  });

  it('la condición por persona se evalúa con las respuestas de esa persona', () => {
    const valores = {
      invitacion: {},
      personas: { a: { asistencia: true }, b: { asistencia: false } },
    };
    expect(preguntaAplica(apodo, 'g1', new Set(), valores, 'a', ambitos)).toBe(
      true,
    );
    expect(preguntaAplica(apodo, 'g1', new Set(), valores, 'b', ambitos)).toBe(
      false,
    );
  });

  it('una pregunta de la invitación condicionada a una por persona basta con que la cumpla alguna', () => {
    const nadie = {
      invitacion: {},
      personas: { a: { asistencia: false }, b: { asistencia: false } },
    };
    const alguien = {
      invitacion: {},
      personas: { a: { asistencia: false }, b: { asistencia: true } },
    };
    expect(preguntaAplica(dress, 'g1', new Set(), nadie, null, ambitos)).toBe(
      false,
    );
    expect(preguntaAplica(dress, 'g1', new Set(), alguien, null, ambitos)).toBe(
      true,
    );
  });

  it('completado: la asistencia de todas las personas y lo demás solo de quien viene', () => {
    const preguntas = [asistencia, apodo, dress];
    const comprobar = (valores: Parameters<typeof estaCompletado>[2]) =>
      estaCompletado(preguntas, ['a', 'b'], valores, (p, personaId) =>
        preguntaAplica(p, 'g1', new Set(), valores, personaId, ambitos),
      );
    // Falta la asistencia de b.
    expect(
      comprobar({ invitacion: {}, personas: { a: { asistencia: false } } }),
    ).toBe(false);
    // Nadie va: no hace falta nada más.
    expect(
      comprobar({
        invitacion: {},
        personas: { a: { asistencia: false }, b: { asistencia: false } },
      }),
    ).toBe(true);
    // Va a: faltan su apodo y el dress code.
    expect(
      comprobar({
        invitacion: {},
        personas: { a: { asistencia: true }, b: { asistencia: false } },
      }),
    ).toBe(false);
    expect(
      comprobar({
        invitacion: { dress: 'X' },
        personas: {
          a: { asistencia: true, apodo: 'La Gran A' },
          b: { asistencia: false },
        },
      }),
    ).toBe(true);
  });
});

describe('enlace', () => {
  it('genera tokens únicos de 22 caracteres base64url', () => {
    const a = generarToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(a).not.toBe(generarToken());
  });

  it('une nombres en castellano', () => {
    expect(unirNombres([])).toBe('');
    expect(unirNombres(['Ana'])).toBe('Ana');
    expect(unirNombres(['Ana', 'su pareja'])).toBe('Ana y su pareja');
    expect(unirNombres(['Pedro', 'Marta', 'Lucía'])).toBe(
      'Pedro, Marta y Lucía',
    );
  });

  it('normaliza teléfonos y construye enlaces de WhatsApp', () => {
    expect(normalizarTelefono('600 11 22 33')).toBe('34600112233');
    expect(normalizarTelefono('+44 7700 900123')).toBe('447700900123');
    expect(normalizarTelefono('0034600112233')).toBe('34600112233');
    expect(normalizarTelefono('')).toBeNull();
    const enlace = construirEnlace('https://boda.test/', 'abc');
    expect(enlace).toBe('https://boda.test/i/abc');
    const mensaje = construirMensaje('Hola {nombre}: {enlace}', 'Ana', enlace);
    expect(construirUrlWhatsapp('600112233', mensaje)).toBe(
      `https://wa.me/34600112233?text=${encodeURIComponent('Hola Ana: https://boda.test/i/abc')}`,
    );
    expect(construirUrlWhatsapp(null, mensaje)).toBeNull();
  });
});
