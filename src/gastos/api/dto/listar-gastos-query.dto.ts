import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { EstadoPagoGasto } from '../../domain/gasto';

export class ListarGastosQueryDto {
  @IsOptional()
  @IsUUID()
  plazaId?: string;

  @IsOptional()
  @IsUUID()
  fechaId?: string;

  @IsOptional()
  @IsUUID()
  paseId?: string;

  @IsOptional()
  @IsUUID()
  categoriaId?: string;

  @IsOptional()
  @IsEnum(EstadoPagoGasto)
  estadoPago?: EstadoPagoGasto;
}
