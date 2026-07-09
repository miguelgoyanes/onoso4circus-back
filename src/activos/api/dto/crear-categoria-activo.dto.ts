import { IsBoolean, IsString, Matches, MinLength } from 'class-validator';

export class CrearCategoriaActivoDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'cuentaContableCode debe ser un código de 6 dígitos' })
  cuentaContableCode: string;

  @IsBoolean()
  aplicaIva: boolean;
}
