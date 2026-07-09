import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsUUID, ValidateNested } from 'class-validator';
import { LineaVentaEntradasDto } from './linea-venta-entradas.dto';

export class CrearLoteVentasEntradasDto {
  @IsUUID()
  paseId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LineaVentaEntradasDto)
  lineas: LineaVentaEntradasDto[];
}
