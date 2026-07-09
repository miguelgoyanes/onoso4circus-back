import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MinLength, ValidateIf } from 'class-validator';
import { EstadoCobro } from '../../domain/estado-cobro';
import { TipoFiscal } from '../../domain/tipo-fiscal';

export class CrearContratoIngresoDto {
  @IsString()
  @MinLength(1)
  cliente: string;

  @IsString()
  @MinLength(1)
  concepto: string;

  @IsDateString()
  fecha: string;

  @IsEnum(EstadoCobro)
  estadoCobro: EstadoCobro;

  @ValidateIf((o: CrearContratoIngresoDto) => o.estadoCobro === EstadoCobro.COBRADO)
  @IsUUID()
  cuentaDestinoId?: string;

  @IsOptional()
  @IsUUID()
  plazaId?: string;

  @IsOptional()
  @IsUUID()
  fechaId?: string;

  @IsOptional()
  @IsUUID()
  paseId?: string;

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
