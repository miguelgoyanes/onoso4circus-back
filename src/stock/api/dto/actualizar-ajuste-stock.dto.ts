import { IsDateString, IsEnum, IsInt, IsOptional, IsPositive, IsUUID } from 'class-validator';
import { TipoAjusteStock } from '../../domain/tipo-ajuste-stock';

export class ActualizarAjusteStockDto {
  @IsEnum(TipoAjusteStock)
  tipo: TipoAjusteStock;

  @IsInt()
  @IsPositive()
  cantidad: number;

  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsUUID()
  plazaId?: string;

  @IsOptional()
  @IsUUID()
  fechaId?: string;

  @IsOptional()
  @IsUUID()
  paseId?: string;
}
