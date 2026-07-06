import { IsEnum, IsString, Matches, MinLength } from 'class-validator';
import { Rol } from '../../domain/usuario';
import { USERNAME_REGEX, USERNAME_REGEX_MESSAGE } from '../../domain/username';

export class CrearUsuarioDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsString()
  @Matches(USERNAME_REGEX, { message: USERNAME_REGEX_MESSAGE })
  username: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(Rol)
  rol: Rol;
}
