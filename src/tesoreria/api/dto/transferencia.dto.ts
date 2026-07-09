import { IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class TransferenciaDto {
  @IsUUID()
  origenId: string;

  @IsUUID()
  destinoId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  importe: number;

  @IsOptional()
  @IsString()
  concepto?: string;
}
