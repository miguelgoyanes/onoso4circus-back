import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TipoFiscal } from '../../domain/tipo-fiscal';

export class DatosEconomicosActivoDto {
  @IsUUID()
  categoriaId: string;

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
}

export class ActualizarActivoDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsInt()
  @IsPositive()
  vidaUtilAnios: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valorResidual: number;

  // Presente solo si se quieren cambiar los datos económicos — el servicio rechaza esto si el
  // activo ya tiene amortización registrada.
  @IsOptional()
  @ValidateNested()
  @Type(() => DatosEconomicosActivoDto)
  economia?: DatosEconomicosActivoDto;
}
