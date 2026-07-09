import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsUUID, ValidateIf } from 'class-validator';
import { TipoFiscal } from '../../domain/tipo-fiscal';

export class CrearRecepcionStockDto {
  @IsUUID()
  productoId: string;

  @IsInt()
  @IsPositive()
  cantidad: number;

  @IsDateString()
  fecha: string;

  @IsUUID()
  cuentaOrigenId: string;

  @IsOptional()
  @IsUUID()
  plazaId?: string;

  @IsOptional()
  @IsEnum(TipoFiscal)
  tipoFiscal?: TipoFiscal;

  // tipoFiscal = B (o no indicado)
  @ValidateIf((o: CrearRecepcionStockDto) => o.tipoFiscal !== TipoFiscal.A)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  costeUnitario?: number;

  // tipoFiscal = A
  @ValidateIf((o: CrearRecepcionStockDto) => o.tipoFiscal === TipoFiscal.A)
  @IsNumber({ maxDecimalPlaces: 2 })
  ivaPercent?: number;

  @ValidateIf((o: CrearRecepcionStockDto) => o.tipoFiscal === TipoFiscal.A)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  baseImponible?: number;
}
