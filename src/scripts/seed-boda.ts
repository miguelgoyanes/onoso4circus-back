import 'dotenv/config';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { crearSlug } from '../boda/application/grupo-pregunta.service';
import { CondicionPregunta, TipoPregunta } from '../boda/domain/pregunta';
import type { AmbitoPregunta } from '../boda/domain/pregunta';
import {
  BODA_CONFIG_ID,
  BodaConfigOrmEntity,
  BodaGrupoOrmEntity,
  BodaPreguntaGrupoOrmEntity,
  BodaPreguntaOrmEntity,
  ENTIDADES_BODA,
} from '../boda/infrastructure/orm/boda.orm-entities';

// Datos iniciales de la boda. Solo crea lo que falta (por slug / clave / fila única):
// nunca pisa lo que Brandan y Fátima hayan editado después en el back office.

// Los apartados de la lista de invitados de los novios (25-oct-2026); se ven así agrupados en el back office.
const GRUPOS = [
  'Familia de Fátima',
  'Familia de Brandan',
  'Familia y amigos del circo',
  'Amigos de Fátima',
  'Segunda familia de Brandan',
  'Magos',
  'Amigo de Brandan (cantante)',
  'Familia de Ponferrada',
];

interface PreguntaInicial {
  clave: string;
  texto: string;
  // Versión para invitaciones con varias personas (si no hay, se usa `texto`).
  textoPlural?: string;
  ambito: AmbitoPregunta;
  tipo: TipoPregunta;
  opciones?: string[];
  obligatoria: boolean;
  permiteNota?: boolean;
  condicion?: CondicionPregunta;
  // Solo para estos grupos (por slug); sin grupos, para todos.
  grupos?: string[];
}

// Cuando alguien de la invitación asiste (si hay varias personas, basta con que asista una).
const SI_ASISTE: CondicionPregunta = { clave: 'asistencia', igual: true };

// El orden de la lista es el orden del flujo: primero las preguntas de broma (la de la mesa, una por grupo),
// luego fecha y lugar (pantalla del frontal), quién va y, solo para quien va, lo demás; el apodo cierra.
// Textos de Brandan y Fátima (25-oct-2026).
const PREGUNTAS: PreguntaInicial[] = [
  {
    clave: 'donde_se_conocieron',
    texto: '💕 ¿Cómo se conocieron los novios?',
    ambito: 'invitacion',
    tipo: TipoPregunta.OPCION,
    opciones: [
      'Se conocieron en un bar porque Fátima pensaba que Brandan era gay. 😂',
      'Se conocieron por Tinder y lo que empezó con un match acabó en boda. 📱',
      'Los presentó una amiga en común mientras hablaban de que ellos jamás se casarían. 💍',
      'Fátima fue a ver un circo y allí conoció a Brandan. ❤️',
    ],
    obligatoria: true,
  },
  {
    clave: 'dress_code',
    texto: '👗 ¿Cómo vas a interpretar el dress code de la boda?',
    textoPlural: '👗 ¿Cómo vais a interpretar el dress code de la boda?',
    ambito: 'invitacion',
    tipo: TipoPregunta.OPCION,
    opciones: [
      'Lo más parecido a una bola de discoteca posible. 🪩',
      'No lo sé, le preguntaré a ChatGPT. 🤖',
      'Lentejuelas y brilli-brilli a todo lo que dé. ✨',
      'Voy a interpretar el dress code como una sugerencia, no como una obligación. 😎',
    ],
    obligatoria: true,
  },
  {
    clave: 'mesa_circo',
    texto:
      'Eres artista de circo y te sientan en la mesa de los magos. ¿Qué haces?',
    textoPlural:
      'Sois artistas de circo y os sientan en la mesa de los magos. ¿Qué hacéis?',
    ambito: 'invitacion',
    tipo: TipoPregunta.OPCION,
    opciones: [
      'Me hago pasar por mago y saco una carta de la manga. Lo malo es que era el menú.',
      'Les digo que mi especialidad es la magia de cerca: tan cerca que ya me he comido su postre.',
      'Me invento un truco en el que todos cierran los ojos y cambio los nombres de las tarjetas de sitio.',
      'Convenzo al mago para que se haga artista de circo. Le vendo la vida como un sueño de aplausos, pero no le cuento lo de cargar la carpa.',
    ],
    obligatoria: true,
    grupos: ['familia-y-amigos-del-circo'],
  },
  {
    clave: 'mesa_magos',
    texto:
      'Eres mago y te sientan en la mesa de los artistas de circo. ¿Qué haces?',
    textoPlural:
      'Sois magos y os sientan en la mesa de los artistas de circo. ¿Qué hacéis?',
    ambito: 'invitacion',
    tipo: TipoPregunta.OPCION,
    opciones: [
      'Les enseño mi mejor truco. Me dicen que está bien para alguien que trabaja siempre a ras de suelo.',
      'A los cinco minutos ya me creo artista de circo y estoy buscando nombre artístico.',
      'Me preguntan si quiero probar una disciplina. Digo que sí y me ponen a montar la carpa.',
      'Pregunto si alguien quiere ver un truco. Me dicen que sí, pero que primero les explique cómo consigo cobrar sin montar ni desmontar nada.',
    ],
    obligatoria: true,
    grupos: ['magos'],
  },
  {
    clave: 'mesa_familia',
    texto:
      'Eres familiar de los novios y te sientan en la mesa de los artistas de circo y los magos. ¿Qué haces?',
    textoPlural:
      'Sois familia de los novios y os sientan en la mesa de los artistas de circo y los magos. ¿Qué hacéis?',
    ambito: 'invitacion',
    tipo: TipoPregunta.OPCION,
    opciones: [
      'Me siento tranquilamente a cenar. A los diez minutos estoy buscando en Google si esta gente necesita algún tipo de supervisión adulta.',
      'Me preguntan si quiero participar en un número. Digo que sí por educación y ahora estoy metido en una caja.',
      'Le pido al mago que me enseñe un truco. Acabo barajando yo mientras él se come mi comida.',
      'Le enseño al mago las fotos de mis vacaciones. Él me enseña un truco. Los dos fingimos estar impresionados.',
    ],
    obligatoria: true,
    grupos: [
      'familia-de-fatima',
      'familia-de-brandan',
      'segunda-familia-de-brandan',
      'familia-de-ponferrada',
    ],
  },
  {
    clave: 'mesa_amigos',
    texto:
      'Eres amigo de los novios y te sientan en la mesa de los artistas de circo y los magos. ¿Qué haces?',
    textoPlural:
      'Sois amigos de los novios y os sientan en la mesa de los artistas de circo y los magos. ¿Qué hacéis?',
    ambito: 'invitacion',
    tipo: TipoPregunta.OPCION,
    opciones: [
      'A los diez minutos ya he decidido que no voy a contar ninguna anécdota mía. Aquí la competencia está demasiado alta.',
      'Me preguntan si creo en la magia. Les digo que sí, porque todavía no entiendo cómo los novios han conseguido reunir a esta gente.',
      'El mago me pregunta si quiero conocer el secreto de su truco. Le digo que no, que prefiero seguir creyendo que tiene estudios superiores.',
      'Veo lo que se cuece en esta mesa, salgo corriendo sin mirar atrás y que los novios me expliquen luego qué clase de boda era esta.',
    ],
    obligatoria: true,
    grupos: ['amigos-de-fatima', 'amigo-de-brandan-cantante'],
  },
  {
    clave: 'escenario',
    texto:
      '🎪 Si los novios te invitan a subir al escenario para participar en un espectáculo durante la boda, ¿qué haces?',
    textoPlural:
      '🎪 Si los novios os invitan a subir al escenario para participar en un espectáculo durante la boda, ¿qué hacéis?',
    ambito: 'invitacion',
    tipo: TipoPregunta.OPCION,
    opciones: [
      '¿Pero no era una boda? Yo había venido a comer y beber gratis. 🍷',
      'Subo, nada me haría más ilusión que eso.',
      'Ni de coña. Hoy he venido a disfrutar, no a trabajar. 😂',
      'Depende de cuánto haya bebido y de si hay vídeos que puedan comprometerme. 🥂',
    ],
    obligatoria: true,
  },
  {
    clave: 'asistencia',
    texto: 'Ahora en serio: ¿podrás asistir a este día inolvidable?',
    textoPlural: 'Ahora en serio: ¿podréis asistir a este día inolvidable?',
    ambito: 'persona',
    tipo: TipoPregunta.SI_NO,
    obligatoria: true,
    permiteNota: true,
  },
  {
    // Sin pantalla propia en el frontal: se rellena desde la pantalla de asistencia.
    clave: 'alimentacion',
    texto: '¿Alguna alergia o necesidad alimentaria?',
    ambito: 'persona',
    tipo: TipoPregunta.MULTIOPCION,
    opciones: [
      'Vegetariano',
      'Vegano',
      'Sin gluten',
      'Sin lactosa',
      'Alergia a frutos secos',
      'Otra (cuéntalo en la nota)',
    ],
    obligatoria: false,
    permiteNota: true,
    condicion: SI_ASISTE,
  },
  {
    clave: 'mensaje_novios',
    texto:
      'Escríbenos lo que quieras: cuántas ganas tienes de venir, una anécdota…',
    textoPlural:
      'Escribidnos lo que queráis: cuántas ganas tenéis de venir, una anécdota…',
    ambito: 'invitacion',
    tipo: TipoPregunta.TEXTO_LARGO,
    obligatoria: false,
    condicion: SI_ASISTE,
  },
  {
    clave: 'nombre_artistico',
    texto: 'Si fueras un artista de circo, ¿cuál sería tu nombre artístico?',
    textoPlural:
      'Si fuerais artistas de circo, ¿cuál sería el nombre artístico de cada uno?',
    ambito: 'persona',
    tipo: TipoPregunta.TEXTO,
    obligatoria: true,
    condicion: SI_ASISTE,
  },
];

async function main(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: ENTIDADES_BODA,
    // Igual que la aplicación: con DB_SYNC=false (producción, tablas ya creadas) no se toca el esquema.
    synchronize: process.env.DB_SYNC !== 'false',
  });
  await dataSource.initialize();

  try {
    const grupos = dataSource.getRepository(BodaGrupoOrmEntity);
    for (const [orden, nombre] of GRUPOS.entries()) {
      const slug = crearSlug(nombre);
      if (!(await grupos.findOneBy({ slug }))) {
        await grupos.save(
          grupos.create({
            id: randomUUID(),
            nombre,
            slug,
            orden,
            activo: true,
          }),
        );
        console.log(`Grupo creado: ${nombre}`);
      }
    }

    const preguntas = dataSource.getRepository(BodaPreguntaOrmEntity);
    const preguntaGrupos = dataSource.getRepository(BodaPreguntaGrupoOrmEntity);
    for (const [orden, p] of PREGUNTAS.entries()) {
      if (await preguntas.findOneBy({ clave: p.clave })) continue;
      const id = randomUUID();
      await preguntas.save(
        preguntas.create({
          id,
          clave: p.clave,
          texto: p.texto,
          textoPlural: p.textoPlural ?? null,
          ambito: p.ambito,
          tipo: p.tipo,
          opciones: p.opciones ?? null,
          obligatoria: p.obligatoria,
          permiteNota: p.permiteNota ?? false,
          editablePorInvitado: true,
          condicion: p.condicion ?? null,
          orden,
          activa: true,
        }),
      );
      for (const slug of p.grupos ?? []) {
        const grupo = await grupos.findOneBy({ slug });
        if (grupo)
          await preguntaGrupos.save({ preguntaId: id, grupoId: grupo.id });
      }
      console.log(`Pregunta creada: ${p.clave}`);
    }

    const configs = dataSource.getRepository(BodaConfigOrmEntity);
    if (!(await configs.findOneBy({ id: BODA_CONFIG_ID }))) {
      await configs.save(
        configs.create({
          id: BODA_CONFIG_ID,
          fechaLimiteEdicion: null,
          mensajeWhatsapp:
            '¡Hola {nombre}! Tienes una invitación muy especial: {enlace}',
          urlBaseInvitacion:
            process.env.BODA_URL_BASE ?? 'http://localhost:5174',
          activo: true,
        }),
      );
      console.log('Configuración creada');
    }
    console.log('Seed de la boda completado.');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('Error en el seed de la boda:', error);
  process.exitCode = 1;
});
