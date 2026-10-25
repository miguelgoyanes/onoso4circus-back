import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CondicionPregunta, TipoPregunta } from '../../domain/pregunta';
import type { AmbitoPregunta } from '../../domain/pregunta';

// Módulo aislado del resto del sistema: tablas boda_* sin claves foráneas hacia (ni desde)
// ninguna otra tabla, ni siquiera entre ellas — así se puede quitar el módulo sin tocar nada más.

@Entity('boda_grupos')
export class BodaGrupoOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar' })
  nombre: string;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  slug: string;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}

@Entity('boda_invitados')
export class BodaInvitadoOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar', name: 'grupo_id' })
  grupoId: string;

  @Column({ type: 'varchar' })
  nombre: string;

  @Column({ type: 'varchar' })
  apellidos: string;

  @Column({ type: 'varchar', nullable: true })
  telefono: string | null;

  // Cómo se nombra la invitación entera ("la familia Goyanes", "Ana y familia"). Si es null se usan
  // los nombres de las personas.
  @Column({ type: 'varchar', nullable: true })
  tratamiento: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  token: string;

  @Column({ type: 'text', name: 'notas_internas', nullable: true })
  notasInternas: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  // Invitado de pruebas: no cuenta en la lista real ni en el resumen; sirve para que los novios
  // vean la invitación como la vería un invitado, y se puede reiniciar o borrar.
  @Column({ type: 'boolean', name: 'es_prueba', default: false })
  esPrueba: boolean;

  @Column({ type: 'timestamptz', name: 'enviado_en', nullable: true })
  enviadoEn: Date | null;

  @Column({ type: 'timestamptz', name: 'completado_en', nullable: true })
  completadoEn: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'actualizado_en' })
  actualizadoEn: Date;
}

// Cada persona invitada dentro de una invitación (el titular y, si los hay, acompañantes o familia).
// Las respuestas "por persona" (asistencia, nombre artístico, alergias) cuelgan de ellas.
@Entity('boda_personas')
export class BodaPersonaOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Index()
  @Column({ type: 'varchar', name: 'invitado_id' })
  invitadoId: string;

  // Cómo se la nombra a ella en la invitación ("Ana", "su pareja"…).
  @Column({ type: 'varchar' })
  nombre: string;

  // Plaza sin nombre conocido (p. ej. los hijos): el nombre lo escribe el propio invitado.
  @Column({ type: 'boolean', name: 'nombre_libre', default: false })
  nombreLibre: boolean;

  @Column({ type: 'int', default: 0 })
  orden: number;

  // La persona a la que va dirigida la invitación; no se puede quitar.
  @Column({ type: 'boolean', default: false })
  titular: boolean;
}

@Entity('boda_preguntas')
export class BodaPreguntaOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  clave: string;

  @Column({ type: 'text' })
  texto: string;

  // Versión en plural del texto, para invitaciones con varias personas (si no hay, se usa `texto`).
  @Column({ type: 'text', name: 'texto_plural', nullable: true })
  textoPlural: string | null;

  @Column({ type: 'varchar', default: 'invitacion' })
  ambito: AmbitoPregunta;

  @Column({ type: 'varchar' })
  tipo: TipoPregunta;

  @Column({ type: 'jsonb', nullable: true })
  opciones: string[] | null;

  @Column({ type: 'boolean', default: true })
  obligatoria: boolean;

  @Column({ type: 'boolean', name: 'permite_nota', default: false })
  permiteNota: boolean;

  @Column({ type: 'boolean', name: 'editable_por_invitado', default: true })
  editablePorInvitado: boolean;

  @Column({ type: 'jsonb', nullable: true })
  condicion: CondicionPregunta | null;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ type: 'boolean', default: true })
  activa: boolean;
}

// Sin filas para una pregunta = aplica a todos los grupos.
@Entity('boda_pregunta_grupo')
export class BodaPreguntaGrupoOrmEntity {
  @PrimaryColumn({ type: 'varchar', name: 'pregunta_id' })
  preguntaId: string;

  @PrimaryColumn({ type: 'varchar', name: 'grupo_id' })
  grupoId: string;
}

export type OrigenCambio = 'invitado' | 'admin';

// Estado actual de cada respuesta (una fila por invitado, pregunta y —si la pregunta es por persona—
// persona); la historia va en boda_eventos.
@Entity('boda_respuestas')
@Index(['invitadoId', 'preguntaId', 'personaId'], { unique: true })
export class BodaRespuestaOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar', name: 'invitado_id' })
  invitadoId: string;

  @Column({ type: 'varchar', name: 'pregunta_id' })
  preguntaId: string;

  // '' = respuesta de la invitación entera.
  @Column({ type: 'varchar', name: 'persona_id', default: '' })
  personaId: string;

  @Column({ type: 'jsonb' })
  valor: unknown;

  @Column({ type: 'text', nullable: true })
  nota: string | null;

  @Column({ type: 'varchar' })
  origen: OrigenCambio;

  @UpdateDateColumn({ type: 'timestamptz', name: 'actualizado_en' })
  actualizadoEn: Date;
}

@Entity('boda_accesos')
export class BodaAccesoOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Index()
  @Column({ type: 'varchar', name: 'invitado_id' })
  invitadoId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;

  @Column({ type: 'varchar', name: 'user_agent', nullable: true })
  userAgent: string | null;

  // Hash de la IP, nunca la IP en claro.
  @Column({ type: 'varchar', name: 'ip_hash', nullable: true })
  ipHash: string | null;
}

export type TipoEvento =
  | 'respuesta_creada'
  | 'respuesta_modificada'
  | 'respuesta_eliminada'
  | 'completado'
  | 'envio_marcado'
  | 'token_regenerado';

// Log de solo-añadir.
@Entity('boda_eventos')
export class BodaEventoOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Index()
  @Column({ type: 'varchar', name: 'invitado_id' })
  invitadoId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;

  @Column({ type: 'varchar' })
  tipo: TipoEvento;

  @Column({ type: 'varchar', name: 'pregunta_id', nullable: true })
  preguntaId: string | null;

  @Column({ type: 'varchar', name: 'persona_id', nullable: true })
  personaId: string | null;

  @Column({ type: 'jsonb', name: 'valor_anterior', nullable: true })
  valorAnterior: unknown;

  @Column({ type: 'jsonb', name: 'valor_nuevo', nullable: true })
  valorNuevo: unknown;

  @Column({ type: 'varchar' })
  origen: OrigenCambio;

  @Column({ type: 'varchar', name: 'usuario_id', nullable: true })
  usuarioId: string | null;
}

export const BODA_CONFIG_ID = 'config';

// Fila única.
@Entity('boda_config')
export class BodaConfigOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  // null = sin límite.
  @Column({ type: 'timestamptz', name: 'fecha_limite_edicion', nullable: true })
  fechaLimiteEdicion: Date | null;

  @Column({ type: 'text', name: 'mensaje_whatsapp' })
  mensajeWhatsapp: string;

  @Column({ type: 'varchar', name: 'url_base_invitacion' })
  urlBaseInvitacion: string;

  // Interruptor general: false = los endpoints públicos responden 404.
  @Column({ type: 'boolean', default: true })
  activo: boolean;
}

export const ENTIDADES_BODA = [
  BodaGrupoOrmEntity,
  BodaInvitadoOrmEntity,
  BodaPersonaOrmEntity,
  BodaPreguntaOrmEntity,
  BodaPreguntaGrupoOrmEntity,
  BodaRespuestaOrmEntity,
  BodaAccesoOrmEntity,
  BodaEventoOrmEntity,
  BodaConfigOrmEntity,
];
