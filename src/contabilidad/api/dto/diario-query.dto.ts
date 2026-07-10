import { IsDateString, IsOptional, IsString } from 'class-validator';

export class DiarioQueryDto {
  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;

  // Ids de cuenta separados por comas (ej. "id1,id2") — se parten en el controller.
  @IsOptional()
  @IsString()
  cuentaIds?: string;
}
