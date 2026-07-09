export class CategoriaActivo {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
    public readonly cuentaContableId: string,
    public readonly aplicaIva: boolean,
    public readonly esPredefinida: boolean,
  ) {}

  public conNombre(nombre: string): CategoriaActivo {
    return new CategoriaActivo(this.id, nombre, this.cuentaContableId, this.aplicaIva, this.esPredefinida);
  }

  public conDatos(nombre: string, aplicaIva: boolean, cuentaContableId: string = this.cuentaContableId): CategoriaActivo {
    return new CategoriaActivo(this.id, nombre, cuentaContableId, aplicaIva, this.esPredefinida);
  }
}
