import { IsDateString, IsEnum } from 'class-validator';
import { TipoActividad } from '../../domain/tipo-actividad';

export class CrearFechaDto {
  @IsDateString()
  fecha: string;

  @IsEnum(TipoActividad)
  tipoActividad: TipoActividad;
}
