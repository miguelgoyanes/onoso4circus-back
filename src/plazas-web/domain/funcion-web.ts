export class FuncionWeb {
  constructor(
    public readonly id: string,
    public readonly plazaWebId: string,
    public readonly fecha: Date,
    public readonly horarios: string[],
    public readonly descuento: number | null = null,
    public readonly descuentoDescripcion: string | null = null,
  ) {}

  public conDatos(
    fecha: Date,
    horarios: string[],
    descuento: number | null = null,
    descuentoDescripcion: string | null = null,
  ): FuncionWeb {
    return new FuncionWeb(this.id, this.plazaWebId, fecha, horarios, descuento, descuentoDescripcion);
  }
}
