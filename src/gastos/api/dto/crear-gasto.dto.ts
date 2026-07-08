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
import {
  CategoriaGastoGeneral,
  CategoriaGastoPlaza,
  ConceptoGastoDerivado,
  EstadoPagoGasto,
  TipoGasto,
} from '../../domain/gasto';

class GastoDerivadoDto {
  @IsEnum(ConceptoGastoDerivado)
  concepto: ConceptoGastoDerivado;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  importe: number;
}

export class CrearGastoDto {
  @IsEnum(TipoGasto)
  tipo: TipoGasto;

  @IsDateString()
  fecha: string;

  @IsString()
  @MinLength(1)
  descripcion: string;

  @IsEnum(EstadoPagoGasto)
  estadoPago: EstadoPagoGasto;

  @ValidateIf((o: CrearGastoDto) => o.estadoPago === EstadoPagoGasto.PAGADO)
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

  // tipo = PERSONAL
  @ValidateIf((o: CrearGastoDto) => o.tipo === TipoGasto.PERSONAL)
  @IsString()
  @MinLength(1)
  empleadoId?: string;

  @IsOptional()
  @IsString()
  asignacionId?: string;

  @ValidateIf((o: CrearGastoDto) => o.tipo === TipoGasto.PERSONAL)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  importeSalario?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  costeSs?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GastoDerivadoDto)
  gastosDerivados?: GastoDerivadoDto[];

  // tipo = PLAZA
  @ValidateIf((o: CrearGastoDto) => o.tipo === TipoGasto.PLAZA)
  @IsEnum(CategoriaGastoPlaza)
  categoriaPlaza?: CategoriaGastoPlaza;

  // tipo = GENERAL
  @ValidateIf((o: CrearGastoDto) => o.tipo === TipoGasto.GENERAL)
  @IsEnum(CategoriaGastoGeneral)
  categoriaGeneral?: CategoriaGastoGeneral;

  // tipo = PLAZA | GENERAL
  @ValidateIf((o: CrearGastoDto) => o.tipo === TipoGasto.PLAZA || o.tipo === TipoGasto.GENERAL)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  importe?: number;
}
