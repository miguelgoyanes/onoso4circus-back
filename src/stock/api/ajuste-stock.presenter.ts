import { AjusteStock } from '../domain/ajuste-stock';

export interface AjusteStockPublico {
  id: string;
  productoId: string;
  productoNombre: string;
  tipo: string;
  cantidad: number;
  costeUnitarioAplicado: string;
  fecha: string;
  plazaId?: string;
  fechaId?: string;
  paseId?: string;
}

export function toAjusteStockPublico(ajuste: AjusteStock, productoNombre: string): AjusteStockPublico {
  return {
    id: ajuste.id,
    productoId: ajuste.productoId,
    productoNombre,
    tipo: ajuste.tipo,
    cantidad: ajuste.cantidad,
    costeUnitarioAplicado: ajuste.costeUnitarioAplicado.toString(),
    fecha: ajuste.fecha.toISOString(),
    plazaId: ajuste.plazaId,
    fechaId: ajuste.fechaId,
    paseId: ajuste.paseId,
  };
}
