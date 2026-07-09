import { IsEnum } from 'class-validator';
import { DireccionOrden } from '../../domain/direccion-orden';

export class MoverProductoDto {
  @IsEnum(DireccionOrden)
  direccion: DireccionOrden;
}
