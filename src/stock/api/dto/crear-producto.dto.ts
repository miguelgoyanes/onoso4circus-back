import { IsBoolean, IsEnum, IsNumber, IsOptional, IsPositive, IsString, MinLength, ValidateIf } from 'class-validator';
import { TipoProducto } from '../../domain/tipo-producto';

export class CrearProductoDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  // Obligatorio salvo para INSUMO — un insumo nunca se vende directamente, no tiene PVP.
  @ValidateIf((dto) => dto.tipo !== TipoProducto.INSUMO)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precioVentaPublico?: number;

  @IsBoolean()
  aplicaIva: boolean;

  @IsOptional()
  @IsEnum(TipoProducto)
  tipo?: TipoProducto;

  // Obligatorios cuando tipo = ELABORADO (validado en ProductoService.crear).
  @ValidateIf((dto) => dto.tipo === TipoProducto.ELABORADO)
  @IsString()
  familiaElaboradoId?: string;

  @ValidateIf((dto) => dto.tipo === TipoProducto.ELABORADO)
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  factorEquivalencia?: number;
}
