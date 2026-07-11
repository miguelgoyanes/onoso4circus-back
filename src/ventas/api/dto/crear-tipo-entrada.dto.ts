import { IsBoolean, IsEnum, IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';
import { ModalidadTipoEntrada } from '../../domain/modalidad-tipo-entrada';

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

  @IsEnum(ModalidadTipoEntrada)
  modalidad: ModalidadTipoEntrada;
}
