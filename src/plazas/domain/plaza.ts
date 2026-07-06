export class Plaza {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
    public readonly ubicacion: string,
  ) {}

  public conDatos(nombre: string, ubicacion: string): Plaza {
    return new Plaza(this.id, nombre, ubicacion);
  }
}
