import { CandidatosParaImporte } from '../application/candidatos-por-importe';

export interface CandidatosParaImportePublico {
  ventaIds: string[];
  totalAlcanzado: string;
  diferencia: string;
}

export function toCandidatosParaImportePublico(c: CandidatosParaImporte): CandidatosParaImportePublico {
  return {
    ventaIds: c.ventaIds,
    totalAlcanzado: c.totalAlcanzado.toString(),
    diferencia: c.diferencia.toString(),
  };
}
