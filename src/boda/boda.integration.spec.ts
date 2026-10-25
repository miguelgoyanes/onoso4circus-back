import { randomUUID } from 'crypto';
import { ConfigModule } from '@nestjs/config';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmTestModule } from '../test/typeorm-test.module';
import { BodaModule } from './boda.module';
import { BodaConfigService } from './application/boda-config.service';
import {
  GrupoService,
  PreguntaService,
} from './application/grupo-pregunta.service';
import { InvitacionPublicaService } from './application/invitacion-publica.service';
import { InvitadoService } from './application/invitado.service';
import { PersonaService } from './application/persona.service';
import { RespuestaService } from './application/respuesta.service';
import { TipoPregunta } from './domain/pregunta';

describe('Boda (integración contra Postgres real)', () => {
  let moduleRef: import('@nestjs/testing').TestingModule;
  let grupos: GrupoService;
  let preguntas: PreguntaService;
  let invitados: InvitadoService;
  let respuestas: RespuestaService;
  let publico: InvitacionPublicaService;
  let personas: PersonaService;
  let config: BodaConfigService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmTestModule,
        BodaModule,
      ],
    }).compile();
    await moduleRef.init();
    grupos = moduleRef.get(GrupoService);
    preguntas = moduleRef.get(PreguntaService);
    invitados = moduleRef.get(InvitadoService);
    respuestas = moduleRef.get(RespuestaService);
    publico = moduleRef.get(InvitacionPublicaService);
    personas = moduleRef.get(PersonaService);
    config = moduleRef.get(BodaConfigService);
  });

  afterAll(async () => {
    await config.actualizar({ fechaLimiteEdicion: null, activo: true });
    await moduleRef.close();
  });

  it('flujo completo: abrir, responder, completar, regenerar token, fecha límite y edición del admin', async () => {
    const sufijo = randomUUID().slice(0, 8);
    const grupo = await grupos.crear({ nombre: `Amigos ${sufijo}` });
    const asistencia = await preguntas.crear({
      clave: `asistencia_${sufijo.replace(/-/g, '')}`,
      texto: '¿Vienes?',
      tipo: TipoPregunta.SI_NO,
      permiteNota: true,
      grupoIds: [grupo.id],
    });
    const apodo = await preguntas.crear({
      clave: `apodo_${sufijo.replace(/-/g, '')}`,
      texto: 'Nombre artístico',
      tipo: TipoPregunta.TEXTO,
      grupoIds: [grupo.id],
    });

    const creado = await invitados.crear({
      grupoId: grupo.id,
      nombre: 'Ana',
      apellidos: 'Pérez',
      telefono: '600112233',
    });
    const token = creado.enlace.split('/i/')[1];

    const vista = await publico.abrir(token, 'jest', '127.0.0.1');
    expect(vista.invitado.nombre).toBe('Ana');
    expect(vista.completado).toBe(false);

    await config.actualizar({ fechaLimiteEdicion: null, activo: true });
    const tras = await publico.guardar(token, [
      { clave: apodo.clave, valor: '  La Gran Ana ' },
      { clave: asistencia.clave, valor: true, nota: 'Voy con ganas' },
    ]);
    expect(tras.completado).toBe(true);
    expect(tras.respuestas[apodo.clave].valor).toBe('La Gran Ana');

    const ficha = await invitados.obtener(creado.id);
    expect(ficha.aperturas.total).toBe(1);
    expect(ficha.completadoEn).not.toBeNull();

    // Regenerar el token: el enlace viejo da 404 y las respuestas se conservan.
    const regenerado = await invitados.regenerarToken(creado.id, null);
    await expect(
      publico.abrir(token, undefined, undefined),
    ).rejects.toBeInstanceOf(NotFoundException);
    const nuevoToken = regenerado.enlace.split('/i/')[1];
    expect(nuevoToken).not.toBe(token);
    const conservada = await publico.abrir(nuevoToken, undefined, undefined);
    expect(conservada.respuestas[apodo.clave].valor).toBe('La Gran Ana');

    // Pasada la fecha límite el invitado no puede cambiar nada, pero el admin sí.
    await config.actualizar({
      fechaLimiteEdicion: new Date(Date.now() - 1000),
    });
    await expect(
      publico.guardar(nuevoToken, [{ clave: apodo.clave, valor: 'Otro' }]),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await respuestas.guardar(
      creado.id,
      [{ clave: asistencia.clave, valor: false }],
      'admin',
      null,
    );
    const final = await invitados.obtener(creado.id);
    expect(final.respuestas[asistencia.clave].valor).toBe(false);
    expect(final.respuestas[asistencia.clave].origen).toBe('admin');

    const historial = await invitados.historial(creado.id);
    const tipos = historial.eventos.map((e) => e.tipo);
    expect(tipos).toEqual(
      expect.arrayContaining([
        'respuesta_creada',
        'respuesta_modificada',
        'completado',
        'token_regenerado',
      ]),
    );
  });

  it('token de pruebas: no cuenta en la lista ni en el resumen, se reinicia y se borra', async () => {
    const sufijo = randomUUID().slice(0, 8);
    const grupo = await grupos.crear({ nombre: `Pruebas ${sufijo}` });
    const pregunta = await preguntas.crear({
      clave: `apodo_${sufijo.replace(/-/g, '')}`,
      texto: 'Nombre artístico',
      tipo: TipoPregunta.TEXTO,
      grupoIds: [grupo.id],
    });
    await config.actualizar({ fechaLimiteEdicion: null, activo: true });

    const antes = (await invitados.resumen()).total;
    const prueba = await invitados.crearPrueba(grupo.id);
    expect(prueba.esPrueba).toBe(true);
    expect((await invitados.listar()).some((i) => i.id === prueba.id)).toBe(
      false,
    );
    expect(
      (await invitados.listarPruebas()).some((i) => i.id === prueba.id),
    ).toBe(true);
    expect((await invitados.resumen()).total).toBe(antes);

    const token = prueba.enlace.split('/i/')[1];
    await publico.abrir(token, 'jest', '127.0.0.1');
    await publico.guardar(token, [
      { clave: pregunta.clave, valor: 'Mago de prueba' },
    ]);
    expect((await invitados.obtener(prueba.id)).completado).toBe(true);

    const reiniciada = await invitados.reiniciar(prueba.id);
    expect(reiniciada.enlace).toBe(prueba.enlace);
    expect(reiniciada.completado).toBe(false);
    expect(reiniciada.aperturas.total).toBe(0);
    expect(Object.keys(reiniciada.respuestas)).toHaveLength(0);

    await invitados.eliminar(prueba.id);
    await expect(
      publico.abrir(token, undefined, undefined),
    ).rejects.toBeInstanceOf(NotFoundException);

    // Un invitado real también se puede reiniciar y borrar.
    const real = await invitados.crear({
      grupoId: grupo.id,
      nombre: 'Real',
      apellidos: 'Persona',
    });
    await invitados.eliminar(real.id);
    await expect(invitados.obtener(real.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('invitación con varias personas: asistencia, apodos y alergias por persona', async () => {
    const sufijo = randomUUID().slice(0, 8).replace(/-/g, '');
    const grupo = await grupos.crear({ nombre: `Parejas ${sufijo}` });
    const asistencia = await preguntas.crear({
      clave: `asiste_${sufijo}`,
      texto: '¿Vienes?',
      textoPlural: '¿Quiénes venís?',
      ambito: 'persona',
      tipo: TipoPregunta.SI_NO,
      grupoIds: [grupo.id],
    });
    const apodo = await preguntas.crear({
      clave: `apodo_${sufijo}`,
      texto: 'Nombre artístico',
      ambito: 'persona',
      tipo: TipoPregunta.TEXTO,
      condicion: { clave: asistencia.clave, igual: true },
      grupoIds: [grupo.id],
    });
    const alergias = await preguntas.crear({
      clave: `alergias_${sufijo}`,
      texto: 'Alergias',
      ambito: 'persona',
      tipo: TipoPregunta.TEXTO,
      obligatoria: false,
      condicion: { clave: asistencia.clave, igual: true },
      grupoIds: [grupo.id],
    });
    const dress = await preguntas.crear({
      clave: `dress_${sufijo}`,
      texto: 'Dress code',
      ambito: 'invitacion',
      tipo: TipoPregunta.TEXTO,
      condicion: { clave: asistencia.clave, igual: true },
      grupoIds: [grupo.id],
    });

    const creado = await invitados.crear({
      grupoId: grupo.id,
      nombre: 'Ana',
      apellidos: 'Pérez',
      telefono: '600112233',
      acompanantes: ['Pablo', 'Lucía'],
    });
    expect(creado.personas.map((p) => p.nombre)).toEqual([
      'Ana',
      'Pablo',
      'Lucía',
    ]);
    expect(creado.personas[0].titular).toBe(true);
    expect(creado.nombresInvitacion).toBe('Ana, Pablo y Lucía');
    expect(creado.whatsappUrl).toContain(
      encodeURIComponent('Ana, Pablo y Lucía'),
    );
    const [ana, pablo, lucia] = creado.personas;
    const token = creado.enlace.split('/i/')[1];
    await config.actualizar({ fechaLimiteEdicion: null, activo: true });

    const vista = await publico.abrir(token, 'jest', '127.0.0.1');
    expect(vista.personas).toHaveLength(3);
    expect(vista.preguntas.find((p) => p.clave === asistencia.clave)).toEqual(
      expect.objectContaining({
        ambito: 'persona',
        textoPlural: '¿Quiénes venís?',
      }),
    );

    // Las preguntas por persona exigen persona y las de la invitación no la admiten.
    await expect(
      publico.guardar(token, [{ clave: asistencia.clave, valor: true }]),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      publico.guardar(token, [
        { clave: asistencia.clave, valor: true, personaId: randomUUID() },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      publico.guardar(token, [
        { clave: dress.clave, valor: 'X', personaId: ana.id },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);

    // Va Ana, no va Pablo; de Lucía no se sabe: sin decidir.
    let tras = await publico.guardar(token, [
      { clave: asistencia.clave, valor: true, personaId: ana.id },
      { clave: asistencia.clave, valor: false, personaId: pablo.id },
    ]);
    expect(tras.completado).toBe(false);
    // Quien no va no tiene apodo.
    await expect(
      publico.guardar(token, [
        { clave: apodo.clave, valor: 'El Pablo', personaId: pablo.id },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);

    tras = await publico.guardar(token, [
      { clave: asistencia.clave, valor: false, personaId: lucia.id },
      { clave: apodo.clave, valor: 'La Gran Ana', personaId: ana.id },
    ]);
    // Falta el dress code de la invitación (va alguien).
    expect(tras.completado).toBe(false);
    tras = await publico.guardar(token, [
      { clave: dress.clave, valor: 'Brillo' },
      { clave: alergias.clave, valor: 'Gluten', personaId: ana.id },
    ]);
    expect(tras.completado).toBe(true);
    expect(tras.respuestasPersona[ana.id][apodo.clave].valor).toBe(
      'La Gran Ana',
    );
    expect(tras.respuestas[dress.clave].valor).toBe('Brillo');

    // El invitado puede vaciar una respuesta no obligatoria, pero no una obligatoria.
    tras = await publico.guardar(token, [
      { clave: alergias.clave, valor: null, personaId: ana.id },
    ]);
    expect(tras.respuestasPersona[ana.id][alergias.clave]).toBeUndefined();
    await expect(
      publico.guardar(token, [
        { clave: apodo.clave, valor: null, personaId: ana.id },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);

    const ficha = await invitados.obtener(creado.id);
    // La decisión global se deduce de la pregunta de clave "asistencia"; esta prueba usa claves propias.
    expect(ficha.asistencia).toBeNull();
    expect(ficha.respuestasPersona[ana.id][asistencia.clave].valor).toBe(true);
    const resumen = await invitados.resumen();
    expect(resumen.personas).toBeGreaterThanOrEqual(3);

    // El historial distingue a qué persona corresponde cada cambio.
    const historial = await invitados.historial(creado.id);
    expect(
      historial.eventos.some(
        (e) => e.personaId === ana.id && e.preguntaClave === apodo.clave,
      ),
    ).toBe(true);

    // Nadie va: la invitación queda completa sin apodos ni dress code.
    const otra = await invitados.crear({
      grupoId: grupo.id,
      nombre: 'Marta',
      apellidos: 'López',
      acompanantes: ['su pareja'],
    });
    const tokenOtra = otra.enlace.split('/i/')[1];
    const sinNadie = await publico.guardar(
      tokenOtra,
      otra.personas.map((p) => ({
        clave: asistencia.clave,
        valor: false,
        personaId: p.id,
      })),
    );
    expect(sinNadie.completado).toBe(true);

    // Gestión de personas: se añaden y se quitan (menos el titular), con sus respuestas.
    const extra = await personas.crear(creado.id, 'Hugo');
    expect((await invitados.obtener(creado.id)).personas).toHaveLength(4);
    await respuestas.guardar(
      creado.id,
      [{ clave: asistencia.clave, valor: true, personaId: extra.id }],
      'admin',
      null,
    );
    await personas.eliminar(creado.id, extra.id);
    const sinHugo = await invitados.obtener(creado.id);
    expect(sinHugo.personas).toHaveLength(3);
    expect(sinHugo.respuestasPersona[extra.id]).toBeUndefined();
    await expect(personas.eliminar(creado.id, ana.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    // Renombrar al titular desde la ficha del invitado lo mantiene sincronizado.
    await invitados.actualizar(creado.id, { nombre: 'Anita' });
    expect((await invitados.obtener(creado.id)).personas[0].nombre).toBe(
      'Anita',
    );
  });
});
