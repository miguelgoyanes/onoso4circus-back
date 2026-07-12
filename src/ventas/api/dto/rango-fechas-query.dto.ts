import { IsDateString } from 'class-validator';

export class RangoFechasRequeridoQueryDto {
  @IsDateString()
  desde: string;

  @IsDateString()
  hasta: string;
}
