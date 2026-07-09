import Decimal from 'decimal.js';

export class TipoEntrada {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
    public readonly precio: Decimal,
    public readonly aplicaIva: boolean,
    public readonly color: string | null,
    public readonly orden: number,
    public readonly activo: boolean = true,
  ) {}

  public conDatos(nombre: string, precio: Decimal, aplicaIva: boolean, color: string | null): TipoEntrada {
    return new TipoEntrada(this.id, nombre, precio, aplicaIva, color, this.orden, this.activo);
  }

  public conOrden(orden: number): TipoEntrada {
    return new TipoEntrada(this.id, this.nombre, this.precio, this.aplicaIva, this.color, orden, this.activo);
  }

  public desactivado(): TipoEntrada {
    return new TipoEntrada(this.id, this.nombre, this.precio, this.aplicaIva, this.color, this.orden, false);
  }

  public activado(): TipoEntrada {
    return new TipoEntrada(this.id, this.nombre, this.precio, this.aplicaIva, this.color, this.orden, true);
  }
}
