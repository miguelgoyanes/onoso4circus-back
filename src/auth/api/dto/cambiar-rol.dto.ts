import { IsEnum } from 'class-validator';
import { Rol } from '../../domain/usuario';

export class CambiarRolDto {
  @IsEnum(Rol)
  rol: Rol;
}
