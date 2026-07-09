import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { TipoFiscal } from '../../domain/tipo-fiscal';

export class CrearActivoDto {
  @IsUUID()
  categoriaId: string;

  @IsString()
  @MinLength(1)
  nombre: string;

  @IsDateString()
  fechaCompra: string;

  @IsUUID()
  cuentaPagoId: string;

  @IsOptional()
  @IsEnum(TipoFiscal)
  tipoFiscal?: TipoFiscal;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  ivaPercent?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  baseImponible?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  importe?: number;

  @IsInt()
  @IsPositive()
  vidaUtilAnios: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valorResidual: number;
}
