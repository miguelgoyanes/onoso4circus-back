import { IsOptional, IsString, MinLength } from 'class-validator';

export class CrearPaseDto {
  @IsString()
  @MinLength(1)
  hora: string;

  @IsOptional()
  @IsString()
  nombre?: string;
}
