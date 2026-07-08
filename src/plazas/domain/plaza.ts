import { TipoPlaza } from './tipo-plaza';

export class Plaza {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
    public readonly ubicacion: string,
    public readonly tipoPlaza: TipoPlaza = TipoPlaza.CON_CIRCO,
  ) {}

  public conDatos(nombre: string, ubicacion: string, tipoPlaza: TipoPlaza = this.tipoPlaza): Plaza {
    return new Plaza(this.id, nombre, ubicacion, tipoPlaza);
  }
}
