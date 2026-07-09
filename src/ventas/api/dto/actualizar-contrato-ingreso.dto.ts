import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';
import { TipoFiscal } from '../../domain/tipo-fiscal';

export class ActualizarContratoIngresoDto {
  @IsString()
  @MinLength(1)
  cliente: string;

  @IsString()
  @MinLength(1)
  concepto: string;

  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsEnum(TipoFiscal)
  tipoFiscal?: TipoFiscal;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  importe?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  ivaPercent?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  baseImponible?: number;
}
