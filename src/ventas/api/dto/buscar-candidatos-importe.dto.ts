import { IsDateString, IsEnum, IsNumber, Min } from 'class-validator';
import { TipoFiscal } from '../../domain/tipo-fiscal';

export class BuscarCandidatosImporteDto {
  @IsDateString()
  desde: string;

  @IsDateString()
  hasta: string;

  // Bucket del que se SACA el importe (A o B) — el destino es el otro.
  @IsEnum(TipoFiscal)
  origen: TipoFiscal;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  importeObjetivo: number;
}
