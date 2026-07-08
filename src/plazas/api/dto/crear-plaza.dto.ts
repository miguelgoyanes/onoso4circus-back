import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { TipoPlaza } from '../../domain/tipo-plaza';

export class CrearPlazaDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsString()
  @MinLength(1)
  ubicacion: string;

  @IsOptional()
  @IsEnum(TipoPlaza)
  tipoPlaza?: TipoPlaza;
}
