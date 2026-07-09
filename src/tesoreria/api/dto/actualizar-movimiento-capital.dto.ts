import { IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { TipoMovimientoCapital } from '../../domain/tipo-movimiento-capital';

export class ActualizarMovimientoCapitalDto {
  @IsEnum(TipoMovimientoCapital)
  tipo: TipoMovimientoCapital;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  importe: number;

  @IsOptional()
  @IsString()
  concepto?: string;
}
