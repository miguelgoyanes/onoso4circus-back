import { IsString, MinLength } from 'class-validator';

export class CrearFamiliaElaboradoDto {
  @IsString()
  @MinLength(1)
  nombre: string;
}
