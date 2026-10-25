import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TipoPregunta } from '../../domain/pregunta';
import type { AmbitoPregunta } from '../../domain/pregunta';

export class CrearInvitadoDto {
  @IsUUID()
  grupoId: string;

  @IsString()
  @MinLength(1)
  nombre: string;

  @IsString()
  @MinLength(1)
  apellidos: string;

  @IsOptional()
  @IsString()
  telefono?: string | null;

  @IsOptional()
  @IsString()
  notasInternas?: string | null;

  // Cómo se nombra la invitación entera ("la familia Goyanes"); vacío = los nombres de las personas.
  @IsOptional()
  @IsString()
  @MaxLength(120)
  tratamiento?: string | null;

  // Otras personas de la invitación (pareja, familia…); el titular es nombre + apellidos. "?" = plaza sin nombre.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acompanantes?: string[];
}

// Vacío = plaza sin nombre (lo escribe el invitado).
export class NombrePersonaDto {
  @IsString()
  @MaxLength(80)
  nombre: string;
}

export class NombrePlazaDto {
  @IsUUID()
  personaId: string;

  @IsString()
  @MaxLength(80)
  nombre: string;
}

export class CrearPruebaDto {
  @IsUUID()
  grupoId: string;

  @IsOptional()
  @IsString()
  nombre?: string;
}

export class ActualizarInvitadoDto {
  @IsOptional()
  @IsUUID()
  grupoId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  apellidos?: string;

  @IsOptional()
  @IsString()
  telefono?: string | null;

  @IsOptional()
  @IsString()
  notasInternas?: string | null;

  // Cómo se nombra la invitación entera ("la familia Goyanes"); vacío = los nombres de las personas.
  @IsOptional()
  @IsString()
  @MaxLength(120)
  tratamiento?: string | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class ImportarInvitadoItemDto {
  // Nombre del grupo; si no existe se crea.
  @IsString()
  @MinLength(1)
  grupo: string;

  @IsString()
  @MinLength(1)
  nombre: string;

  // Opcional al importar: en la lista de la boda muchos invitados van solo con el nombre.
  @IsOptional()
  @IsString()
  apellidos?: string;

  @IsOptional()
  @IsString()
  telefono?: string | null;

  @IsOptional()
  @IsString()
  notasInternas?: string | null;

  // Cómo se nombra la invitación entera ("la familia Goyanes"); vacío = los nombres de las personas.
  @IsOptional()
  @IsString()
  @MaxLength(120)
  tratamiento?: string | null;

  // Otras personas de la invitación (pareja, familia…); el titular es nombre + apellidos. "?" = plaza sin nombre.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acompanantes?: string[];
}

export class ImportarInvitadosDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportarInvitadoItemDto)
  invitados: ImportarInvitadoItemDto[];
}

export class RespuestaItemDto {
  @IsString()
  @MinLength(1)
  clave: string;

  // El tipo depende de la pregunta; lo valida el dominio. null solo para el admin (borra la respuesta).
  @Allow()
  valor: unknown;

  @IsOptional()
  @IsString()
  nota?: string | null;

  // Solo en las preguntas "por persona": a quién corresponde la respuesta.
  @IsOptional()
  @IsUUID()
  personaId?: string | null;
}

export class GuardarRespuestasDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RespuestaItemDto)
  respuestas: RespuestaItemDto[];

  // Solo desde la invitación: nombres que el invitado escribe para sus plazas sin nombre.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NombrePlazaDto)
  nombres?: NombrePlazaDto[];
}

export class CrearGrupoDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsOptional()
  @IsInt()
  orden?: number;
}

export class ActualizarGrupoDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  nombre?: string;

  @IsOptional()
  @IsInt()
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class CondicionPreguntaDto {
  @IsString()
  @MinLength(1)
  clave: string;

  @Allow()
  igual: unknown;
}

export class CrearPreguntaDto {
  @IsString()
  clave: string;

  @IsString()
  @MinLength(1)
  texto: string;

  @IsOptional()
  @IsString()
  textoPlural?: string | null;

  @IsOptional()
  @IsIn(['invitacion', 'persona'])
  ambito?: AmbitoPregunta;

  @IsEnum(TipoPregunta)
  tipo: TipoPregunta;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  opciones?: string[] | null;

  @IsOptional()
  @IsBoolean()
  obligatoria?: boolean;

  @IsOptional()
  @IsBoolean()
  permiteNota?: boolean;

  @IsOptional()
  @IsBoolean()
  editablePorInvitado?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => CondicionPreguntaDto)
  condicion?: CondicionPreguntaDto | null;

  @IsOptional()
  @IsInt()
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  grupoIds?: string[];
}

export class ActualizarPreguntaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  texto?: string;

  @IsOptional()
  @IsString()
  textoPlural?: string | null;

  @IsOptional()
  @IsIn(['invitacion', 'persona'])
  ambito?: AmbitoPregunta;

  @IsOptional()
  @IsEnum(TipoPregunta)
  tipo?: TipoPregunta;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  opciones?: string[] | null;

  @IsOptional()
  @IsBoolean()
  obligatoria?: boolean;

  @IsOptional()
  @IsBoolean()
  permiteNota?: boolean;

  @IsOptional()
  @IsBoolean()
  editablePorInvitado?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => CondicionPreguntaDto)
  condicion?: CondicionPreguntaDto | null;

  @IsOptional()
  @IsInt()
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  grupoIds?: string[];
}

export class ActualizarConfigBodaDto {
  // null = sin fecha límite.
  @IsOptional()
  @IsDateString()
  fechaLimiteEdicion?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  mensajeWhatsapp?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  urlBaseInvitacion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
