export class Pase {
  constructor(
    public readonly id: string,
    public readonly fechaId: string,
    public readonly hora: string,
    public readonly nombre?: string,
  ) {}

  public conDatos(hora: string, nombre?: string): Pase {
    return new Pase(this.id, this.fechaId, hora, nombre);
  }
}
