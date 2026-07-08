import { IsUUID } from 'class-validator';

export class PagarGastoDto {
  @IsUUID()
  cuentaPagoId: string;
}
