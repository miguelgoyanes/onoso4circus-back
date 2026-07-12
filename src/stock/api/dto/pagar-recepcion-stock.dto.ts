import { IsUUID } from 'class-validator';

export class PagarRecepcionStockDto {
  @IsUUID()
  cuentaOrigenId: string;
}
