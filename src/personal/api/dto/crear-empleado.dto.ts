import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';
import { RegimenEmpleado } from '../../domain/regimen-empleado';

export class CrearEmpleadoDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsString()
  @MinLength(1)
  rol: string;

  @IsEnum(RegimenEmpleado)
  regimen: RegimenEmpleado;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  importeReferenciaDia?: number;
}
