import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { EstadoCobro } from '../../domain/estado-cobro';

export class ListarContratosIngresoQueryDto {
  @IsOptional()
  @IsUUID()
  plazaId?: string;

  @IsOptional()
  @IsEnum(EstadoCobro)
  estadoCobro?: EstadoCobro;
}
