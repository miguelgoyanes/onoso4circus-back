import { Producto } from '../domain/producto';

export interface ProductoPublico {
  id: string;
  nombre: string;
  precioVentaPublico: string;
  costeUnitarioActual: string;
  cantidadActual: number;
  aplicaIva: boolean;
  activo: boolean;
  imagenUrl: string | null;
  orden: number;
}

export function toProductoPublico(producto: Producto): ProductoPublico {
  return {
    id: producto.id,
    nombre: producto.nombre,
    precioVentaPublico: producto.precioVentaPublico.toString(),
    costeUnitarioActual: producto.costeUnitarioActual.toString(),
    cantidadActual: producto.cantidadActual,
    aplicaIva: producto.aplicaIva,
    activo: producto.activo,
    imagenUrl: producto.imagenUrl,
    orden: producto.orden,
  };
}

// Vista reducida para quien solo necesita vender (Bar): sin coste ni cantidad en
// stock, que son datos de gestión (margen/inventario) ajenos a registrar una venta.
export interface ProductoVentaPublico {
  id: string;
  nombre: string;
  precioVentaPublico: string;
  aplicaIva: boolean;
  activo: boolean;
  imagenUrl: string | null;
  orden: number;
}

export function toProductoVentaPublico(producto: Producto): ProductoVentaPublico {
  return {
    id: producto.id,
    nombre: producto.nombre,
    precioVentaPublico: producto.precioVentaPublico.toString(),
    aplicaIva: producto.aplicaIva,
    activo: producto.activo,
    imagenUrl: producto.imagenUrl,
    orden: producto.orden,
  };
}
