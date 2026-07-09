import Decimal from 'decimal.js';
import type { ValueTransformer } from 'typeorm';
import { VentaBarLinea } from '../../domain/venta-bar';

interface VentaBarLineaJson {
  productoId: string;
  cantidad: number;
  precioUnitarioAplicado: string;
  costeUnitarioAplicado: string;
}

export const ventaBarLineaTransformer: ValueTransformer = {
  to: (value: VentaBarLinea[] | undefined): VentaBarLineaJson[] =>
    (value ?? []).map((l) => ({
      productoId: l.productoId,
      cantidad: l.cantidad,
      precioUnitarioAplicado: l.precioUnitarioAplicado.toString(),
      costeUnitarioAplicado: l.costeUnitarioAplicado.toString(),
    })),
  from: (value: VentaBarLineaJson[] | null): VentaBarLinea[] =>
    (value ?? []).map(
      (l) => new VentaBarLinea(l.productoId, l.cantidad, new Decimal(l.precioUnitarioAplicado), new Decimal(l.costeUnitarioAplicado)),
    ),
};
