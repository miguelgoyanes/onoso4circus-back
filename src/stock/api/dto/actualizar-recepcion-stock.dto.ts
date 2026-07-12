import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsUUID, ValidateIf } from 'class-validator';
import { TipoFiscal } from '../../domain/tipo-fiscal';
import { UnidadMedida } from '../../domain/unidad-medida';
import { EstadoPagoRecepcion } from '../../domain/estado-pago-recepcion';

export class ActualizarRecepcionStockDto {
  @IsInt()
  @IsPositive()
  cantidad: number;

  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsEnum(EstadoPagoRecepcion)
  estadoPago?: EstadoPagoRecepcion;

  @ValidateIf((o: ActualizarRecepcionStockDto) => o.estadoPago !== EstadoPagoRecepcion.PENDIENTE_PAGO)
  @IsUUID()
  cuentaOrigenId?: string;

  @IsOptional()
  @IsUUID()
  plazaId?: string;

  @IsOptional()
  @IsEnum(TipoFiscal)
  tipoFiscal?: TipoFiscal;

  @ValidateIf((o: ActualizarRecepcionStockDto) => o.tipoFiscal !== TipoFiscal.A)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  costeUnitario?: number;

  @ValidateIf((o: ActualizarRecepcionStockDto) => o.tipoFiscal === TipoFiscal.A)
  @IsNumber({ maxDecimalPlaces: 2 })
  ivaPercent?: number;

  @ValidateIf((o: ActualizarRecepcionStockDto) => o.tipoFiscal === TipoFiscal.A)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  baseImponible?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  cantidadMedida?: number;

  @IsOptional()
  @IsEnum(UnidadMedida)
  unidadMedida?: UnidadMedida;
}
