export class CategoriaGasto {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
    public readonly cuentaContableId: string | null,
    public readonly requiereEmpleado: boolean,
    public readonly esPagoPersonal: boolean,
    public readonly aplicaIva: boolean,
    public readonly esPredefinida: boolean,
  ) {}

  public conNombre(nombre: string): CategoriaGasto {
    return new CategoriaGasto(
      this.id,
      nombre,
      this.cuentaContableId,
      this.requiereEmpleado,
      this.esPagoPersonal,
      this.aplicaIva,
      this.esPredefinida,
    );
  }

  public conDatos(
    nombre: string,
    aplicaIva: boolean,
    requiereEmpleado: boolean,
    cuentaContableId: string | null = this.cuentaContableId,
  ): CategoriaGasto {
    return new CategoriaGasto(
      this.id,
      nombre,
      cuentaContableId,
      requiereEmpleado,
      this.esPagoPersonal,
      aplicaIva,
      this.esPredefinida,
    );
  }
}
