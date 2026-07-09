import { IsOptional, IsUUID } from 'class-validator';

export class ListarVentasEntradasQueryDto {
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
