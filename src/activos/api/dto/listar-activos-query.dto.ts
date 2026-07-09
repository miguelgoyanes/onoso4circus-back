import { IsOptional, IsUUID } from 'class-validator';

export class ListarActivosQueryDto {
  @IsOptional()
  @IsUUID()
  categoriaId?: string;
}
