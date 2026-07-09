import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';
import { TipoMovimientoCapital } from '../../domain/tipo-movimiento-capital';

export class MovimientoCapitalDto {
  @IsUUID()
  cuentaId: string;

  @IsEnum(TipoMovimientoCapital)
  tipo: TipoMovimientoCapital;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  importe: number;

  @IsOptional()
  @IsString()
  concepto?: string;
}
