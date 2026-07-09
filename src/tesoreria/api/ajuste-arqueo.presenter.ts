import { AjusteArqueo } from '../domain/ajuste-arqueo';

export interface AjusteArqueoPublico {
  id: string;
  cuentaId: string;
  importeTeorico: string;
  importeReal: string;
  diferencia: string;
  concepto?: string;
  fecha: string;
}

export function toAjusteArqueoPublico(ajuste: AjusteArqueo): AjusteArqueoPublico {
  return {
    id: ajuste.id,
    cuentaId: ajuste.cuentaId,
    importeTeorico: ajuste.importeTeorico.toString(),
    importeReal: ajuste.importeReal.toString(),
    diferencia: ajuste.diferencia.toString(),
    concepto: ajuste.concepto,
    fecha: ajuste.fecha.toISOString(),
  };
}
