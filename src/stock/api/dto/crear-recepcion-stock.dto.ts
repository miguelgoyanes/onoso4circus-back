import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsUUID, ValidateIf } from 'class-validator';
import { TipoFiscal } from '../../domain/tipo-fiscal';
import { UnidadMedida } from '../../domain/unidad-medida';
import { EstadoPagoRecepcion } from '../../domain/estado-pago-recepcion';

export class CrearRecepcionStockDto {
  @IsUUID()
  productoId: string;

  @IsInt()
  @IsPositive()
  cantidad: number;

  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsEnum(EstadoPagoRecepcion)
  estadoPago?: EstadoPagoRecepcion;

  @ValidateIf((o: CrearRecepcionStockDto) => o.estadoPago !== EstadoPagoRecepcion.PENDIENTE_PAGO)
  @IsUUID()
  cuentaOrigenId?: string;

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

  // Solo para INSUMO — cantidad física comprada (ej. 15), puramente informativa.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  cantidadMedida?: number;

  @IsOptional()
  @IsEnum(UnidadMedida)
  unidadMedida?: UnidadMedida;
}
