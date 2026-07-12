import Decimal from 'decimal.js';

// Compartido por VentaBarService.resumenPorTipoFiscal y VentaEntradasService.resumenPorTipoFiscal
// — mismo desglose A/B para el módulo de reclasificación de IVA, calculado igual en ambos
// orígenes (bar y taquilla) pero como pools independientes.
export interface ResumenPorTipoFiscal {
  totalA: Decimal;
  baseA: Decimal;
  ivaA: Decimal;
  countA: number;
  totalB: Decimal;
  countB: number;
}
