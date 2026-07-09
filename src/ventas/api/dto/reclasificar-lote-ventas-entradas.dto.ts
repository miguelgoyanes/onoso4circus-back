import { ArrayMinSize, IsArray, IsEnum, IsNumber, IsUUID, ValidateIf } from 'class-validator';
import { TipoFiscal } from '../../domain/tipo-fiscal';

export class ReclasificarLoteVentasEntradasDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  ids: string[];

  @IsEnum(TipoFiscal)
  tipoFiscal: TipoFiscal;

  @ValidateIf((o: ReclasificarLoteVentasEntradasDto) => o.tipoFiscal === TipoFiscal.A)
  @IsNumber({ maxDecimalPlaces: 2 })
  ivaPercent?: number;
}
