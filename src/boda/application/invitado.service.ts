import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import {
  construirEnlace,
  construirMensaje,
  construirUrlWhatsapp,
  generarToken,
  nombrarInvitacion,
} from '../domain/enlace';
import {
  BodaAccesoOrmEntity,
  BodaEventoOrmEntity,
  BodaGrupoOrmEntity,
  BodaInvitadoOrmEntity,
  BodaPersonaOrmEntity,
  BodaRespuestaOrmEntity,
  OrigenCambio,
  TipoEvento,
} from '../infrastructure/orm/boda.orm-entities';
import { BodaConfigService } from './boda-config.service';
import { GrupoService } from './grupo-pregunta.service';
import { guardarPersonas } from './persona.service';
import {
  calcularCompletado,
  calcularValores,
  cargarContextoPreguntas,
} from './respuesta.service';

export interface DatosInvitado {
  grupoId: string;
  nombre: string;
  apellidos?: string;
  telefono?: string | null;
  notasInternas?: string | null;
  // Cómo se nombra la invitación entera ("la familia Goyanes"); null = los nombres de las personas.
  tratamiento?: string | null;
  // Otras personas de la invitación (pareja, familia…); solo al crear. "?" = plaza sin nombre.
  acompanantes?: string[];
}

export interface DatosImportInvitado {
  grupo: string;
  nombre: string;
  apellidos?: string;
  telefono?: string | null;
  notasInternas?: string | null;
  tratamiento?: string | null;
  acompanantes?: string[];
}

export interface RespuestaVista {
  valor: unknown;
  nota: string | null;
  origen: OrigenCambio;
  actualizadoEn: Date;
}

export interface VistaInvitado {
  id: string;
  grupo: { id: string; nombre: string } | null;
  nombre: string;
  apellidos: string;
  telefono: string | null;
  notasInternas: string | null;
  tratamiento: string | null;
  activo: boolean;
  esPrueba: boolean;
  enlace: string;
  whatsappUrl: string | null;
  enviadoEn: Date | null;
  completadoEn: Date | null;
  completado: boolean;
  aperturas: { total: number; primera: Date | null; ultima: Date | null };
  // Personas de la invitación (la primera es el titular) y cómo se las nombra juntas ("Ana y su pareja").
  personas: {
    id: string;
    nombre: string;
    titular: boolean;
    nombreLibre: boolean;
  }[];
  nombresInvitacion: string;
  // Decisión de la invitación (asume la pregunta por persona de clave "asistencia"): true si va alguien,
  // false si nadie, null mientras falte por responder alguna persona.
  asistencia: boolean | null;
  // Cuántas personas han dicho que sí.
  asistentes: number;
  // Respuestas de la invitación entera, por clave de pregunta.
  respuestas: Record<string, RespuestaVista>;
  // Respuestas por persona: id de la persona → clave de pregunta → respuesta.
  respuestasPersona: Record<string, Record<string, RespuestaVista>>;
}

export interface ResumenBoda {
  // Invitaciones.
  total: number;
  enviadas: number;
  abiertas: number;
  sinAbrir: number;
  completadas: number;
  // Personas (una invitación puede incluir varias).
  personas: number;
  asistencia: { si: number; no: number; sinResponder: number };
  porGrupo: {
    grupo: string;
    total: number;
    abiertas: number;
    si: number;
    no: number;
    sinResponder: number;
  }[];
}

export const CLAVE_ASISTENCIA = 'asistencia';

@Injectable()
export class InvitadoService {
  constructor(
    @InjectRepository(BodaInvitadoOrmEntity)
    private readonly repository: Repository<BodaInvitadoOrmEntity>,
    @InjectRepository(BodaGrupoOrmEntity)
    private readonly grupoRepository: Repository<BodaGrupoOrmEntity>,
    private readonly grupoService: GrupoService,
    private readonly configService: BodaConfigService,
    private readonly dataSource: DataSource,
  ) {}

  public async crear(datos: DatosInvitado): Promise<VistaInvitado> {
    await this.exigirGrupo(datos.grupoId);
    const invitado = this.nuevo(datos);
    await this.guardarConPersonas([
      { invitado, acompanantes: datos.acompanantes },
    ]);
    return this.obtener(invitado.id);
  }

  // Alta masiva (p. ej. desde un CSV leído en el frontend); los grupos que no existan se crean.
  public async importar(
    items: readonly DatosImportInvitado[],
  ): Promise<{ creados: number }> {
    const grupoPorNombre = new Map<string, BodaGrupoOrmEntity>();
    const nuevos: {
      invitado: BodaInvitadoOrmEntity;
      acompanantes?: string[];
    }[] = [];
    for (const item of items) {
      let grupo = grupoPorNombre.get(item.grupo.trim().toLowerCase());
      if (!grupo) {
        grupo = await this.grupoService.buscarOCrearPorNombre(
          item.grupo.trim(),
        );
        grupoPorNombre.set(item.grupo.trim().toLowerCase(), grupo);
      }
      nuevos.push({
        invitado: this.nuevo({
          ...item,
          apellidos: item.apellidos ?? '',
          grupoId: grupo.id,
        }),
        acompanantes: item.acompanantes,
      });
    }
    await this.guardarConPersonas(nuevos);
    return { creados: nuevos.length };
  }

  public async listar(): Promise<VistaInvitado[]> {
    return this.construirVistas(
      await this.repository.find({
        where: { esPrueba: false },
        order: { apellidos: 'ASC', nombre: 'ASC' },
      }),
    );
  }

  public async listarPruebas(): Promise<VistaInvitado[]> {
    return this.construirVistas(
      await this.repository.find({
        where: { esPrueba: true },
        order: { creadoEn: 'DESC' },
      }),
    );
  }

  // Invitado de pruebas con su propio token: se comporta como uno real pero no figura en la lista ni en el resumen.
  public async crearPrueba(
    grupoId: string,
    nombre?: string,
  ): Promise<VistaInvitado> {
    await this.exigirGrupo(grupoId);
    const invitado = this.nuevo({
      grupoId,
      nombre: nombre?.trim() || 'Prueba',
      apellidos: '(prueba)',
    });
    invitado.esPrueba = true;
    await this.guardarConPersonas([{ invitado }]);
    return this.obtener(invitado.id);
  }

  // Deja al invitado como nuevo (sin respuestas, aperturas ni historial) conservando el mismo enlace.
  public async reiniciar(id: string): Promise<VistaInvitado> {
    await this.exigirExiste(id);
    await this.dataSource.transaction(async (manager) => {
      await this.borrarRastro(manager, id);
      await manager.update(
        BodaInvitadoOrmEntity,
        { id },
        { completadoEn: null, enviadoEn: null },
      );
    });
    return this.obtener(id);
  }

  // Borra al invitado y todo su rastro; su enlace deja de funcionar.
  public async eliminar(id: string): Promise<void> {
    await this.exigirExiste(id);
    await this.dataSource.transaction(async (manager) => {
      await this.borrarRastro(manager, id);
      await manager.delete(BodaPersonaOrmEntity, { invitadoId: id });
      await manager.delete(BodaInvitadoOrmEntity, { id });
    });
  }

  private async exigirExiste(id: string): Promise<void> {
    const invitado = await this.repository.findOneBy({ id });
    if (!invitado) throw new NotFoundException('Invitado no encontrado');
  }

  private async borrarRastro(
    manager: EntityManager,
    invitadoId: string,
  ): Promise<void> {
    await manager.delete(BodaRespuestaOrmEntity, { invitadoId });
    await manager.delete(BodaAccesoOrmEntity, { invitadoId });
    await manager.delete(BodaEventoOrmEntity, { invitadoId });
  }

  public async obtener(id: string): Promise<VistaInvitado> {
    const invitado = await this.repository.findOneBy({ id });
    if (!invitado) throw new NotFoundException('Invitado no encontrado');
    return (await this.construirVistas([invitado]))[0];
  }

  public async actualizar(
    id: string,
    datos: Partial<DatosInvitado> & { activo?: boolean },
  ): Promise<VistaInvitado> {
    const invitado = await this.repository.findOneBy({ id });
    if (!invitado) throw new NotFoundException('Invitado no encontrado');
    if (datos.grupoId !== undefined) {
      await this.exigirGrupo(datos.grupoId);
      invitado.grupoId = datos.grupoId;
    }
    if (datos.nombre !== undefined) {
      invitado.nombre = datos.nombre;
      // El titular se nombra igual que el invitado.
      await this.dataSource.manager.update(
        BodaPersonaOrmEntity,
        { invitadoId: id, titular: true },
        { nombre: datos.nombre.trim() },
      );
    }
    if (datos.apellidos !== undefined)
      invitado.apellidos = datos.apellidos.trim();
    if (datos.telefono !== undefined) invitado.telefono = datos.telefono;
    if (datos.notasInternas !== undefined)
      invitado.notasInternas = datos.notasInternas;
    if (datos.tratamiento !== undefined)
      invitado.tratamiento = datos.tratamiento?.trim() || null;
    if (datos.activo !== undefined) invitado.activo = datos.activo;
    await this.repository.save(invitado);
    return this.obtener(id);
  }

  // Invalida el enlace anterior (pasa a dar 404) y crea uno nuevo para el mismo invitado;
  // respuestas e historial se conservan.
  public async regenerarToken(
    id: string,
    usuarioId: string | null,
  ): Promise<VistaInvitado> {
    const invitado = await this.repository.findOneBy({ id });
    if (!invitado) throw new NotFoundException('Invitado no encontrado');
    invitado.token = generarToken();
    await this.repository.save(invitado);
    await this.registrarEvento(id, 'token_regenerado', usuarioId);
    return this.obtener(id);
  }

  public async marcarEnviado(
    id: string,
    usuarioId: string | null,
  ): Promise<VistaInvitado> {
    const invitado = await this.repository.findOneBy({ id });
    if (!invitado) throw new NotFoundException('Invitado no encontrado');
    invitado.enviadoEn = new Date();
    await this.repository.save(invitado);
    await this.registrarEvento(id, 'envio_marcado', usuarioId);
    return this.obtener(id);
  }

  public async historial(id: string): Promise<{
    invitado: VistaInvitado;
    accesos: BodaAccesoOrmEntity[];
    eventos: (BodaEventoOrmEntity & { preguntaClave: string | null })[];
  }> {
    const invitado = await this.obtener(id);
    const contexto = await cargarContextoPreguntas(this.dataSource.manager);
    const clavePorId = new Map(contexto.preguntas.map((p) => [p.id, p.clave]));
    const [accesos, eventos] = await Promise.all([
      this.dataSource.manager.find(BodaAccesoOrmEntity, {
        where: { invitadoId: id },
        order: { fecha: 'DESC' },
      }),
      this.dataSource.manager.find(BodaEventoOrmEntity, {
        where: { invitadoId: id },
        order: { fecha: 'DESC' },
      }),
    ]);
    return {
      invitado,
      accesos,
      eventos: eventos.map((e) => ({
        ...e,
        preguntaClave: e.preguntaId
          ? (clavePorId.get(e.preguntaId) ?? null)
          : null,
      })),
    };
  }

  public async resumen(): Promise<ResumenBoda> {
    const vistas = (await this.listar()).filter((v) => v.activo);
    // Por personas: una invitación con 3 personas aporta 3 (sí / no / sin responder según cada una).
    const contar = (lista: VistaInvitado[]) => {
      let si = 0;
      let no = 0;
      let sinResponder = 0;
      for (const vista of lista) {
        for (const persona of vista.personas) {
          const valor =
            vista.respuestasPersona[persona.id]?.[CLAVE_ASISTENCIA]?.valor;
          if (valor === true) si += 1;
          else if (valor === false) no += 1;
          else sinResponder += 1;
        }
      }
      return { si, no, sinResponder };
    };
    const nombresGrupo = Array.from(
      new Set(vistas.map((v) => v.grupo?.nombre ?? 'Sin grupo')),
    );
    return {
      total: vistas.length,
      enviadas: vistas.filter((v) => v.enviadoEn).length,
      abiertas: vistas.filter((v) => v.aperturas.total > 0).length,
      sinAbrir: vistas.filter((v) => v.aperturas.total === 0).length,
      completadas: vistas.filter((v) => v.completado).length,
      personas: vistas.reduce((total, v) => total + v.personas.length, 0),
      asistencia: contar(vistas),
      porGrupo: nombresGrupo.map((grupo) => {
        const delGrupo = vistas.filter(
          (v) => (v.grupo?.nombre ?? 'Sin grupo') === grupo,
        );
        return {
          grupo,
          total: delGrupo.length,
          abiertas: delGrupo.filter((v) => v.aperturas.total > 0).length,
          ...contar(delGrupo),
        };
      }),
    };
  }

  private async guardarConPersonas(
    items: readonly {
      invitado: BodaInvitadoOrmEntity;
      acompanantes?: string[];
    }[],
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      for (const { invitado, acompanantes } of items) {
        await manager.save(invitado);
        await guardarPersonas(
          manager,
          invitado.id,
          invitado.nombre,
          acompanantes,
        );
      }
    });
  }

  private nuevo(datos: DatosInvitado): BodaInvitadoOrmEntity {
    return this.repository.create({
      id: randomUUID(),
      grupoId: datos.grupoId,
      nombre: datos.nombre.trim(),
      apellidos: (datos.apellidos ?? '').trim(),
      telefono: datos.telefono?.trim() || null,
      token: generarToken(),
      notasInternas: datos.notasInternas ?? null,
      tratamiento: datos.tratamiento?.trim() || null,
      activo: true,
      esPrueba: false,
      enviadoEn: null,
      completadoEn: null,
    });
  }

  private async exigirGrupo(grupoId: string): Promise<void> {
    if (!(await this.grupoRepository.findOneBy({ id: grupoId })))
      throw new BadRequestException('El grupo no existe');
  }

  private async registrarEvento(
    invitadoId: string,
    tipo: TipoEvento,
    usuarioId: string | null,
  ): Promise<void> {
    await this.dataSource.manager.save(BodaEventoOrmEntity, {
      id: randomUUID(),
      invitadoId,
      tipo,
      preguntaId: null,
      valorAnterior: null,
      valorNuevo: null,
      origen: 'admin',
      usuarioId,
    });
  }

  // Carga en bloque lo necesario (son unos cientos de invitados como mucho) y calcula el estado en memoria.
  private async construirVistas(
    invitados: BodaInvitadoOrmEntity[],
  ): Promise<VistaInvitado[]> {
    if (invitados.length === 0) return [];
    const manager = this.dataSource.manager;
    const ids = invitados.map((i) => i.id);
    const [config, grupos, contexto, respuestas, personas, accesos] =
      await Promise.all([
        this.configService.obtener(),
        manager.find(BodaGrupoOrmEntity),
        cargarContextoPreguntas(manager),
        manager.findBy(BodaRespuestaOrmEntity, { invitadoId: In(ids) }),
        manager.find(BodaPersonaOrmEntity, {
          where: { invitadoId: In(ids) },
          order: { orden: 'ASC' },
        }),
        manager
          .createQueryBuilder(BodaAccesoOrmEntity, 'a')
          .select('a.invitado_id', 'invitadoId')
          .addSelect('COUNT(*)', 'total')
          .addSelect('MIN(a.fecha)', 'primera')
          .addSelect('MAX(a.fecha)', 'ultima')
          .where('a.invitado_id IN (:...ids)', { ids })
          .groupBy('a.invitado_id')
          .getRawMany<{
            invitadoId: string;
            total: string;
            primera: Date;
            ultima: Date;
          }>(),
      ]);
    const grupoPorId = new Map(grupos.map((g) => [g.id, g]));
    const accesosPorInvitado = new Map(accesos.map((a) => [a.invitadoId, a]));
    const clavePorId = new Map(contexto.preguntas.map((p) => [p.id, p.clave]));

    return invitados.map((invitado) => {
      const suyas = respuestas.filter((r) => r.invitadoId === invitado.id);
      const suyasPersonas = personas.filter(
        (p) => p.invitadoId === invitado.id,
      );
      const valores = calcularValores(contexto, suyas);
      const completado = calcularCompletado(
        contexto,
        invitado.grupoId,
        suyasPersonas.map((p) => p.id),
        valores,
      );
      const grupo = grupoPorId.get(invitado.grupoId);
      const acceso = accesosPorInvitado.get(invitado.id);
      const enlace = construirEnlace(config.urlBaseInvitacion, invitado.token);
      const nombresInvitacion = nombrarInvitacion(
        invitado.tratamiento,
        suyasPersonas.length > 0
          ? suyasPersonas.map((p) => p.nombre)
          : [invitado.nombre],
      );

      // Decisión de la invitación a partir de la asistencia de cada persona.
      const asistencias = suyasPersonas.map(
        (p) => valores.personas[p.id]?.[CLAVE_ASISTENCIA],
      );
      const asistentes = asistencias.filter((a) => a === true).length;
      const todasResponden =
        asistencias.length > 0 &&
        asistencias.every((a) => typeof a === 'boolean');
      const asistencia = todasResponden ? asistentes > 0 : null;

      const vistaRespuesta = (r: BodaRespuestaOrmEntity): RespuestaVista => ({
        valor: r.valor,
        nota: r.nota,
        origen: r.origen,
        actualizadoEn: r.actualizadoEn,
      });
      const respuestasPersona: Record<
        string,
        Record<string, RespuestaVista>
      > = {};
      for (const respuesta of suyas) {
        const clave = clavePorId.get(respuesta.preguntaId);
        if (!clave || !respuesta.personaId) continue;
        (respuestasPersona[respuesta.personaId] ??= {})[clave] =
          vistaRespuesta(respuesta);
      }

      return {
        id: invitado.id,
        grupo: grupo ? { id: grupo.id, nombre: grupo.nombre } : null,
        nombre: invitado.nombre,
        apellidos: invitado.apellidos,
        telefono: invitado.telefono,
        notasInternas: invitado.notasInternas,
        tratamiento: invitado.tratamiento,
        activo: invitado.activo,
        esPrueba: invitado.esPrueba,
        enlace,
        whatsappUrl: construirUrlWhatsapp(
          invitado.telefono,
          construirMensaje(config.mensajeWhatsapp, nombresInvitacion, enlace),
        ),
        enviadoEn: invitado.enviadoEn,
        completadoEn: invitado.completadoEn,
        completado,
        aperturas: {
          total: acceso ? Number(acceso.total) : 0,
          primera: acceso?.primera ?? null,
          ultima: acceso?.ultima ?? null,
        },
        personas: suyasPersonas.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          titular: p.titular,
          nombreLibre: p.nombreLibre,
        })),
        nombresInvitacion,
        asistencia,
        asistentes,
        respuestas: Object.fromEntries(
          suyas
            .filter((r) => !r.personaId && clavePorId.has(r.preguntaId))
            .map((r) => [
              clavePorId.get(r.preguntaId) as string,
              vistaRespuesta(r),
            ]),
        ),
        respuestasPersona,
      };
    });
  }
}
