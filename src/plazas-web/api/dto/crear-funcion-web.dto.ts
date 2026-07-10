import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

class OfertaDto {
  @IsInt()
  @IsPositive()
  descuento: number;

  @IsOptional()
  @IsString()
  descripcion?: string;
}

export class CrearFuncionWebDto {
  @IsDateString()
  fecha: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  horarios: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => OfertaDto)
  oferta?: OfertaDto;
}
