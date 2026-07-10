import { IsDateString, IsOptional } from 'class-validator';

export class RangoFechasQueryDto {
  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;
}

export class RangoFechasRequeridoQueryDto {
  @IsDateString()
  desde: string;

  @IsDateString()
  hasta: string;
}
