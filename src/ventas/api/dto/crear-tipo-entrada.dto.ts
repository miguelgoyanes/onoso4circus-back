import { IsBoolean, IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

export class CrearTipoEntradaDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precio: number;

  @IsBoolean()
  aplicaIva: boolean;

  @IsOptional()
  @IsString()
  color?: string;
}
