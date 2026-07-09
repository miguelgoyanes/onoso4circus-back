import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AjusteArqueoDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  importeReal: number;

  @IsOptional()
  @IsString()
  concepto?: string;
}
