import { IsBoolean, IsString, MinLength } from 'class-validator';

export class ActualizarCuentaDineroDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsBoolean()
  usableEnTaquilla: boolean;

  @IsBoolean()
  usableEnBar: boolean;
}
