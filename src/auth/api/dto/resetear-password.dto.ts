import { IsString, MinLength } from 'class-validator';

export class ResetearPasswordDto {
  @IsString()
  @MinLength(8)
  password: string;
}
