import Decimal from 'decimal.js';

export class Producto {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
    public readonly precioVentaPublico: Decimal,
    public readonly costeUnitarioActual: Decimal,
    public readonly cantidadActual: number,
    public readonly aplicaIva: boolean,
    public readonly activo: boolean = true,
    public readonly imagenUrl: string | null = null,
    // Orden manual elegido por Brandon (menor = antes) — determina cómo se listan aquí y,
    // más adelante, cómo aparecerán los productos en la pantalla de venta del bar.
    public readonly orden: number = 0,
  ) {}

  public conDatos(nombre: string, precioVentaPublico: Decimal, aplicaIva: boolean): Producto {
    return new Producto(
      this.id,
      nombre,
      precioVentaPublico,
      this.costeUnitarioActual,
      this.cantidadActual,
      aplicaIva,
      this.activo,
      this.imagenUrl,
      this.orden,
    );
  }

  public conImagen(imagenUrl: string): Producto {
    return new Producto(
      this.id,
      this.nombre,
      this.precioVentaPublico,
      this.costeUnitarioActual,
      this.cantidadActual,
      this.aplicaIva,
      this.activo,
      imagenUrl,
      this.orden,
    );
  }

  // Usado por ProductoService.recalcularDesdeHistorial() — cantidad y coste medio
  // ponderado se recalculan siempre replayando el historial completo de recepciones y
  // ajustes, nunca se parchean de forma incremental.
  public conCantidadYCoste(cantidadActual: number, costeUnitarioActual: Decimal): Producto {
    return new Producto(
      this.id,
      this.nombre,
      this.precioVentaPublico,
      costeUnitarioActual,
      cantidadActual,
      this.aplicaIva,
      this.activo,
      this.imagenUrl,
      this.orden,
    );
  }

  public conOrden(orden: number): Producto {
    return new Producto(
      this.id,
      this.nombre,
      this.precioVentaPublico,
      this.costeUnitarioActual,
      this.cantidadActual,
      this.aplicaIva,
      this.activo,
      this.imagenUrl,
      orden,
    );
  }

  public desactivado(): Producto {
    return new Producto(
      this.id,
      this.nombre,
      this.precioVentaPublico,
      this.costeUnitarioActual,
      this.cantidadActual,
      this.aplicaIva,
      false,
      this.imagenUrl,
      this.orden,
    );
  }

  public activado(): Producto {
    return new Producto(
      this.id,
      this.nombre,
      this.precioVentaPublico,
      this.costeUnitarioActual,
      this.cantidadActual,
      this.aplicaIva,
      true,
      this.imagenUrl,
      this.orden,
    );
  }
}
