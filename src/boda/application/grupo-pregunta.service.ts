import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { CondicionPregunta, TipoPregunta } from '../domain/pregunta';
import type { AmbitoPregunta } from '../domain/pregunta';
import {
  BodaGrupoOrmEntity,
  BodaPreguntaGrupoOrmEntity,
  BodaPreguntaOrmEntity,
} from '../infrastructure/orm/boda.orm-entities';

export interface DatosGrupo {
  nombre: string;
  orden?: number;
  activo?: boolean;
}

export interface DatosPregunta {
  clave?: string;
  texto: string;
  textoPlural?: string | null;
  ambito?: AmbitoPregunta;
  tipo: TipoPregunta;
  opciones?: string[] | null;
  obligatoria?: boolean;
  permiteNota?: boolean;
  editablePorInvitado?: boolean;
  condicion?: CondicionPregunta | null;
  orden?: number;
  activa?: boolean;
  grupoIds?: string[];
}

export type PreguntaConGrupos = BodaPreguntaOrmEntity & { grupoIds: string[] };

export function crearSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class GrupoService {
  constructor(
    @InjectRepository(BodaGrupoOrmEntity)
    private readonly repository: Repository<BodaGrupoOrmEntity>,
  ) {}

  public async listar(): Promise<BodaGrupoOrmEntity[]> {
    return this.repository.find({ order: { orden: 'ASC', nombre: 'ASC' } });
  }

  public async crear(datos: DatosGrupo): Promise<BodaGrupoOrmEntity> {
    const slug = crearSlug(datos.nombre);
    if (!slug)
      throw new BadRequestException('El nombre del grupo no es válido');
    if (await this.repository.findOneBy({ slug }))
      throw new ConflictException(`Ya existe el grupo "${datos.nombre}"`);
    return this.repository.save(
      this.repository.create({
        id: randomUUID(),
        nombre: datos.nombre,
        slug,
        orden: datos.orden ?? 0,
        activo: datos.activo ?? true,
      }),
    );
  }

  public async buscarOCrearPorNombre(
    nombre: string,
  ): Promise<BodaGrupoOrmEntity> {
    const slug = crearSlug(nombre);
    return (
      (await this.repository.findOneBy({ slug })) ?? this.crear({ nombre })
    );
  }

  public async actualizar(
    id: string,
    datos: Partial<DatosGrupo>,
  ): Promise<BodaGrupoOrmEntity> {
    const grupo = await this.repository.findOneBy({ id });
    if (!grupo) throw new NotFoundException('Grupo no encontrado');
    if (datos.nombre !== undefined) grupo.nombre = datos.nombre;
    if (datos.orden !== undefined) grupo.orden = datos.orden;
    if (datos.activo !== undefined) grupo.activo = datos.activo;
    return this.repository.save(grupo);
  }
}

@Injectable()
export class PreguntaService {
  constructor(
    @InjectRepository(BodaPreguntaOrmEntity)
    private readonly repository: Repository<BodaPreguntaOrmEntity>,
    @InjectRepository(BodaPreguntaGrupoOrmEntity)
    private readonly gruposRepository: Repository<BodaPreguntaGrupoOrmEntity>,
    @InjectRepository(BodaGrupoOrmEntity)
    private readonly grupoRepository: Repository<BodaGrupoOrmEntity>,
    private readonly dataSource: DataSource,
  ) {}

  public async listar(): Promise<PreguntaConGrupos[]> {
    const [preguntas, relaciones] = await Promise.all([
      this.repository.find({ order: { orden: 'ASC', clave: 'ASC' } }),
      this.gruposRepository.find(),
    ]);
    return preguntas.map((p) => ({
      ...p,
      grupoIds: relaciones
        .filter((r) => r.preguntaId === p.id)
        .map((r) => r.grupoId),
    }));
  }

  public async crear(datos: DatosPregunta): Promise<PreguntaConGrupos> {
    if (!datos.clave || !/^[a-z][a-z0-9_]*$/.test(datos.clave)) {
      throw new BadRequestException(
        'La clave debe ir en minúsculas, números y guiones bajos',
      );
    }
    if (await this.repository.findOneBy({ clave: datos.clave })) {
      throw new ConflictException(
        `Ya existe una pregunta con la clave ${datos.clave}`,
      );
    }
    this.validarOpciones(datos.tipo, datos.opciones);
    const pregunta = this.repository.create({
      id: randomUUID(),
      clave: datos.clave,
      texto: datos.texto,
      textoPlural: datos.textoPlural?.trim() || null,
      ambito: datos.ambito ?? 'invitacion',
      tipo: datos.tipo,
      opciones: datos.opciones ?? null,
      obligatoria: datos.obligatoria ?? true,
      permiteNota: datos.permiteNota ?? false,
      editablePorInvitado: datos.editablePorInvitado ?? true,
      condicion: datos.condicion ?? null,
      orden: datos.orden ?? 0,
      activa: datos.activa ?? true,
    });
    await this.repository.save(pregunta);
    const grupoIds = await this.reemplazarGrupos(
      pregunta.id,
      datos.grupoIds ?? [],
    );
    return { ...pregunta, grupoIds };
  }

  // La clave es estable (la usa el frontend) y no se puede cambiar.
  public async actualizar(
    id: string,
    datos: Partial<DatosPregunta>,
  ): Promise<PreguntaConGrupos> {
    const pregunta = await this.repository.findOneBy({ id });
    if (!pregunta) throw new NotFoundException('Pregunta no encontrada');
    const tipo = datos.tipo ?? pregunta.tipo;
    const opciones =
      datos.opciones !== undefined ? datos.opciones : pregunta.opciones;
    this.validarOpciones(tipo, opciones);
    if (datos.texto !== undefined) pregunta.texto = datos.texto;
    if (datos.textoPlural !== undefined)
      pregunta.textoPlural = datos.textoPlural?.trim() || null;
    if (datos.ambito !== undefined) pregunta.ambito = datos.ambito;
    pregunta.tipo = tipo;
    pregunta.opciones = opciones ?? null;
    if (datos.obligatoria !== undefined)
      pregunta.obligatoria = datos.obligatoria;
    if (datos.permiteNota !== undefined)
      pregunta.permiteNota = datos.permiteNota;
    if (datos.editablePorInvitado !== undefined)
      pregunta.editablePorInvitado = datos.editablePorInvitado;
    if (datos.condicion !== undefined) pregunta.condicion = datos.condicion;
    if (datos.orden !== undefined) pregunta.orden = datos.orden;
    if (datos.activa !== undefined) pregunta.activa = datos.activa;
    await this.repository.save(pregunta);
    const grupoIds =
      datos.grupoIds !== undefined
        ? await this.reemplazarGrupos(id, datos.grupoIds)
        : (await this.gruposRepository.findBy({ preguntaId: id })).map(
            (r) => r.grupoId,
          );
    return { ...pregunta, grupoIds };
  }

  private validarOpciones(
    tipo: TipoPregunta,
    opciones: string[] | null | undefined,
  ): void {
    const necesitaOpciones =
      tipo === TipoPregunta.OPCION || tipo === TipoPregunta.MULTIOPCION;
    if (necesitaOpciones && (!opciones || opciones.length === 0)) {
      throw new BadRequestException(
        'Las preguntas de opción necesitan al menos una opción',
      );
    }
  }

  private async reemplazarGrupos(
    preguntaId: string,
    grupoIds: string[],
  ): Promise<string[]> {
    const unicos = Array.from(new Set(grupoIds));
    if (unicos.length > 0) {
      const existentes = await this.grupoRepository.findBy({ id: In(unicos) });
      if (existentes.length !== unicos.length)
        throw new BadRequestException('Algún grupo no existe');
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(BodaPreguntaGrupoOrmEntity, { preguntaId });
      if (unicos.length > 0) {
        await manager.insert(
          BodaPreguntaGrupoOrmEntity,
          unicos.map((grupoId) => ({ preguntaId, grupoId })),
        );
      }
    });
    return unicos;
  }
}
