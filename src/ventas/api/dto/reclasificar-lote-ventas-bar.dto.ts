import { ArrayMinSize, IsArray, IsEnum, IsNumber, IsUUID, ValidateIf } from 'class-validator';
import { TipoFiscal } from '../../domain/tipo-fiscal';

export class ReclasificarLoteVentasBarDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  ids: string[];

  @IsEnum(TipoFiscal)
  tipoFiscal: TipoFiscal;

  @ValidateIf((o: ReclasificarLoteVentasBarDto) => o.tipoFiscal === TipoFiscal.A)
  @IsNumber({ maxDecimalPlaces: 2 })
  ivaPercent?: number;
}
