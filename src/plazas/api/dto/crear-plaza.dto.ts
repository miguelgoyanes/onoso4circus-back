import { IsString, MinLength } from 'class-validator';

export class CrearPlazaDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsString()
  @MinLength(1)
  ubicacion: string;
}
