import { IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID, ValidateIf } from 'class-validator';
import { OrigenVenta } from '../../domain/origen-venta';
import { TipoFiscal } from '../../domain/tipo-fiscal';

export class LineaVentaEntradasDto {
  @IsUUID()
  tipoEntradaId: string;

  @IsInt()
  @IsPositive()
  cantidad: number;

  @IsUUID()
  cuentaCobroId: string;

  @IsEnum(OrigenVenta)
  origen: OrigenVenta;

  @IsOptional()
  @IsString()
  numeroEntradaDesde?: string;

  @IsOptional()
  @IsString()
  numeroEntradaHasta?: string;

  @IsOptional()
  @IsEnum(TipoFiscal)
  tipoFiscal?: TipoFiscal;

  @ValidateIf((o: LineaVentaEntradasDto) => o.tipoFiscal === TipoFiscal.A)
  @IsNumber({ maxDecimalPlaces: 2 })
  ivaPercent?: number;
}
