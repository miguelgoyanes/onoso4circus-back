import Decimal from 'decimal.js';
import { ModalidadTipoEntrada } from './modalidad-tipo-entrada';

export class TipoEntrada {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
    public readonly precio: Decimal,
    public readonly aplicaIva: boolean,
    public readonly color: string | null,
    public readonly modalidad: ModalidadTipoEntrada,
    public readonly orden: number,
    public readonly activo: boolean = true,
  ) {}

  public conDatos(
    nombre: string,
    precio: Decimal,
    aplicaIva: boolean,
    color: string | null,
    modalidad: ModalidadTipoEntrada,
  ): TipoEntrada {
    return new TipoEntrada(this.id, nombre, precio, aplicaIva, color, modalidad, this.orden, this.activo);
  }

  public conOrden(orden: number): TipoEntrada {
    return new TipoEntrada(
      this.id,
      this.nombre,
      this.precio,
      this.aplicaIva,
      this.color,
      this.modalidad,
      orden,
      this.activo,
    );
  }

  public desactivado(): TipoEntrada {
    return new TipoEntrada(
      this.id,
      this.nombre,
      this.precio,
      this.aplicaIva,
      this.color,
      this.modalidad,
      this.orden,
      false,
    );
  }

  public activado(): TipoEntrada {
    return new TipoEntrada(
      this.id,
      this.nombre,
      this.precio,
      this.aplicaIva,
      this.color,
      this.modalidad,
      this.orden,
      true,
    );
  }
}
