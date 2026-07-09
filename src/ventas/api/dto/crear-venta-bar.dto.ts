import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsNumber, IsOptional, IsUUID, ValidateIf, ValidateNested } from 'class-validator';
import { LineaPedidoBarDto } from './linea-pedido-bar.dto';
import { TipoFiscal } from '../../domain/tipo-fiscal';

export class CrearVentaBarDto {
  @IsUUID()
  paseId: string;

  @IsUUID()
  cuentaCobroId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LineaPedidoBarDto)
  lineas: LineaPedidoBarDto[];

  @IsOptional()
  @IsEnum(TipoFiscal)
  tipoFiscal?: TipoFiscal;

  @ValidateIf((o: CrearVentaBarDto) => o.tipoFiscal === TipoFiscal.A)
  @IsNumber({ maxDecimalPlaces: 2 })
  ivaPercent?: number;
}
