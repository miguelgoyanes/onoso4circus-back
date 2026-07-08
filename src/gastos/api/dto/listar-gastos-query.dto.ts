import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { EstadoPagoGasto, TipoGasto } from '../../domain/gasto';

export class ListarGastosQueryDto {
  @IsOptional()
  @IsUUID()
  plazaId?: string;

  @IsOptional()
  @IsEnum(TipoGasto)
  tipo?: TipoGasto;

  @IsOptional()
  @IsEnum(EstadoPagoGasto)
  estadoPago?: EstadoPagoGasto;
}
