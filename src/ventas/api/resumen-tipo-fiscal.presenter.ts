import { ResumenPorTipoFiscal } from '../application/resumen-tipo-fiscal';

export interface ResumenPorTipoFiscalPublico {
  totalA: string;
  baseA: string;
  ivaA: string;
  countA: number;
  totalB: string;
  countB: number;
}

export function toResumenPorTipoFiscalPublico(r: ResumenPorTipoFiscal): ResumenPorTipoFiscalPublico {
  return {
    totalA: r.totalA.toString(),
    baseA: r.baseA.toString(),
    ivaA: r.ivaA.toString(),
    countA: r.countA,
    totalB: r.totalB.toString(),
    countB: r.countB,
  };
}
