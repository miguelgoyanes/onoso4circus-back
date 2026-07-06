import { TipoActividad } from './tipo-actividad';

export class Fecha {
  constructor(
    public readonly id: string,
    public readonly plazaId: string,
    public readonly fecha: Date,
    public readonly tipoActividad: TipoActividad,
  ) {}

  public conDatos(fecha: Date, tipoActividad: TipoActividad): Fecha {
    return new Fecha(this.id, this.plazaId, fecha, tipoActividad);
  }
}
