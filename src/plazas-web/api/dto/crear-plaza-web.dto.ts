import { IsEnum, IsInt, IsOptional, IsPositive, IsString, IsUrl, IsUUID, MinLength } from 'class-validator';
import { TipoVenta } from '../../domain/tipo-venta';

export class CrearPlazaWebDto {
  @IsString()
  @MinLength(1)
  ciudad: string;

  @IsString()
  @MinLength(1)
  ubicacion: string;

  @IsUrl()
  mapsUrl: string;

  @IsOptional()
  @IsString()
  descripcion?: string | null;

  @IsUrl()
  entradasUrl: string;

  @IsEnum(TipoVenta)
  venta: TipoVenta;

  @IsOptional()
  @IsInt()
  @IsPositive()
  horasAntes?: number | null;

  @IsOptional()
  @IsUUID()
  plazaId?: string | null;
}
