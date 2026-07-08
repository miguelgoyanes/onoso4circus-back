import { IsBoolean, IsString, Matches, MinLength } from 'class-validator';

export class CrearCategoriaGastoDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'cuentaContableCode debe ser un código de 6 dígitos' })
  cuentaContableCode: string;

  @IsBoolean()
  requiereEmpleado: boolean;

  @IsBoolean()
  aplicaIva: boolean;
}
