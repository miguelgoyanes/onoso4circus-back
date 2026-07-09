import { IsOptional, IsUUID } from 'class-validator';

export class ListarPorProductoQueryDto {
  @IsOptional()
  @IsUUID()
  productoId?: string;
}
