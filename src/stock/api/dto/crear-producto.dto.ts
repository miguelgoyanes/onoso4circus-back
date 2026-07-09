import { IsBoolean, IsNumber, IsPositive, IsString, MinLength } from 'class-validator';

export class CrearProductoDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precioVentaPublico: number;

  @IsBoolean()
  aplicaIva: boolean;
}
