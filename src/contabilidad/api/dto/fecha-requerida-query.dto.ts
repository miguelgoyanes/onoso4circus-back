import { IsDateString } from 'class-validator';

export class FechaRequeridaQueryDto {
  @IsDateString()
  fecha: string;
}
