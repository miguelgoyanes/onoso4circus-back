import { IsEnum } from 'class-validator';
import { DireccionOrden } from '../../domain/direccion-orden';

export class MoverTipoEntradaDto {
  @IsEnum(DireccionOrden)
  direccion: DireccionOrden;
}
