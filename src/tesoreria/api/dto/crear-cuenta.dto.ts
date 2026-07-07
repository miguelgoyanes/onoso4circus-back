import { IsBoolean, IsEnum, IsString, Matches, MinLength } from 'class-validator';
import { AccountType } from '../../../accounting/domain/account';

export class CrearCuentaDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'code debe tener exactamente 6 dígitos' })
  code: string;

  @IsEnum(AccountType)
  type: AccountType;

  @IsBoolean()
  esCuentaDeDinero: boolean;
}
