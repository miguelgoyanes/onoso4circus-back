import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsUUID, ValidateNested } from 'class-validator';
import { LineaPedidoBarDto } from './linea-pedido-bar.dto';

export class ActualizarVentaBarDto {
  @IsUUID()
  cuentaCobroId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LineaPedidoBarDto)
  lineas: LineaPedidoBarDto[];
}
