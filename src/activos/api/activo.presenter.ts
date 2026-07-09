import { Activo } from '../domain/activo';

export interface ActivoPublico {
  id: string;
  categoriaId: string;
  categoriaNombre: string;
  nombre: string;
  fechaCompra: string;
  coste: string;
  cuentaPagoId: string;
  tipoFiscal?: string;
  ivaPercent?: string;
  baseImponible?: string;
  importeIva?: string;
  vidaUtilAnios: number;
  valorResidual: string;
  activo: boolean;
  amortizacionAcumulada: string;
  valorNetoContable: string;
  ultimaAmortizacionRegistradaEn?: string;
}

export function toActivoPublico(activo: Activo, categoriaNombre: string): ActivoPublico {
  const valorNetoContable = activo.coste.minus(activo.amortizacionAcumulada);
  return {
    id: activo.id,
    categoriaId: activo.categoriaId,
    categoriaNombre,
    nombre: activo.nombre,
    fechaCompra: activo.fechaCompra.toISOString().slice(0, 10),
    coste: activo.coste.toString(),
    cuentaPagoId: activo.cuentaPagoId,
    tipoFiscal: activo.tipoFiscal,
    ivaPercent: activo.ivaPercent?.toString(),
    baseImponible: activo.baseImponible?.toString(),
    importeIva: activo.importeIva?.toString(),
    vidaUtilAnios: activo.vidaUtilAnios,
    valorResidual: activo.valorResidual.toString(),
    activo: activo.activo,
    amortizacionAcumulada: activo.amortizacionAcumulada.toString(),
    valorNetoContable: valorNetoContable.toString(),
    ultimaAmortizacionRegistradaEn: activo.ultimaAmortizacionRegistradaEn?.toISOString().slice(0, 10),
  };
}
