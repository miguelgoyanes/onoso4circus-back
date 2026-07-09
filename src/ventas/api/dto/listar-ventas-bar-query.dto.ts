import { IsOptional, IsUUID } from 'class-validator';

export class ListarVentasBarQueryDto {
  @IsOptional()
  @IsUUID()
  paseId?: string;

  @IsOptional()
  @IsUUID()
  fechaId?: string;

  @IsOptional()
  @IsUUID()
  plazaId?: string;
}
