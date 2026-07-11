import { IsDateString } from 'class-validator';

export class IniciarUsoLoteDto {
  // Editable — permite registrar que un lote se abrió hace unos días, no solo "ahora".
  @IsDateString()
  fecha: string;
}
