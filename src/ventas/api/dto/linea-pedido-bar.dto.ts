import { IsInt, IsPositive, IsUUID } from 'class-validator';

export class LineaPedidoBarDto {
  @IsUUID()
  productoId: string;

  @IsInt()
  @IsPositive()
  cantidad: number;
}
