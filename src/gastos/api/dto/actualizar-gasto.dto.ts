import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ConceptoPersonal } from '../../domain/concepto-personal';
import { EstadoPagoGasto } from '../../domain/gasto';
import { TipoFiscal } from '../../domain/tipo-fiscal';

class ConceptoPersonalDto {
  @IsEnum(ConceptoPersonal)
  concepto: ConceptoPersonal;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  importe?: number;

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
}

export class ActualizarGastoDto {
  @IsUUID()
  categoriaId: string;

  @IsDateString()
  fecha: string;

  @IsString()
  @MinLength(1)
  descripcion: string;

  @IsEnum(EstadoPagoGasto)
  estadoPago: EstadoPagoGasto;

  @ValidateIf((o: ActualizarGastoDto) => o.estadoPago === EstadoPagoGasto.PAGADO)
  @IsUUID()
  cuentaPagoId?: string;

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
  @IsUUID()
  empleadoId?: string;

  // categoría normal (!categoria.esPagoPersonal)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  importe?: number;

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

  // categoría personal (categoria.esPagoPersonal)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConceptoPersonalDto)
  conceptos?: ConceptoPersonalDto[];
}
