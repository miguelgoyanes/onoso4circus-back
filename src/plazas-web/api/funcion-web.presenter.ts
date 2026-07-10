import { FuncionWeb } from '../domain/funcion-web';

export interface FuncionWebPublica {
  id: string;
  plazaWebId: string;
  fecha: string;
  horarios: string[];
  descuento: number | null;
  descuentoDescripcion: string | null;
}

export function toFuncionWebPublica(funcionWeb: FuncionWeb): FuncionWebPublica {
  return {
    id: funcionWeb.id,
    plazaWebId: funcionWeb.plazaWebId,
    fecha: funcionWeb.fecha.toISOString().slice(0, 10),
    horarios: funcionWeb.horarios,
    descuento: funcionWeb.descuento,
    descuentoDescripcion: funcionWeb.descuentoDescripcion,
  };
}
