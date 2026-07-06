import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { Rol } from '../../domain/usuario';

export class CrearUsuarioDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(Rol)
  rol: Rol;
}
