import { IsUUID } from 'class-validator';

export class CobrarContratoIngresoDto {
  @IsUUID()
  cuentaDestinoId: string;
}
