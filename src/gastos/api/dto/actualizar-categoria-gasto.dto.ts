import { IsBoolean, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class ActualizarCategoriaGastoDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsBoolean()
  aplicaIva: boolean;

  @IsBoolean()
  requiereEmpleado: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'cuentaContableCode debe ser un código de 6 dígitos' })
  cuentaContableCode?: string;
}
