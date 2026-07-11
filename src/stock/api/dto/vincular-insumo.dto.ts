import { IsString, MinLength } from 'class-validator';

export class VincularInsumoDto {
  @IsString()
  @MinLength(1)
  insumoId: string;
}
