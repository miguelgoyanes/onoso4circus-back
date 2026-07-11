export enum TipoProducto {
  // Lo que se recibe es exactamente lo que se vende (Coca-Cola, patatas...) — PMP normal.
  VENTA_DIRECTA = 'VENTA_DIRECTA',
  // No se vende directamente (maíz, aceite, sal); se compra por lotes y se consume para
  // fabricar un producto ELABORADO. No participa del PMP por unidad.
  INSUMO = 'INSUMO',
  // No tiene stock ni recepciones propias (palomita pequeña/grande); su coste se calcula
  // dinámicamente a partir de los insumos vinculados a su familia.
  ELABORADO = 'ELABORADO',
}
