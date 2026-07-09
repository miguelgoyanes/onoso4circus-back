import { IsBoolean, IsEnum, IsString, MinLength } from 'class-validator';
import { TipoCuentaDinero } from '../../../accounting/domain/account';

export class CrearCuentaDineroDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsEnum(TipoCuentaDinero)
  tipo: TipoCuentaDinero;

  @IsBoolean()
  usableEnTaquilla: boolean;

  @IsBoolean()
  usableEnBar: boolean;
}
