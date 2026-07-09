import { ContratoIngreso } from '../domain/contrato-ingreso';
import { EstadoCobro } from '../domain/estado-cobro';

export interface ContratoIngresoFilter {
  plazaId?: string;
  estadoCobro?: EstadoCobro;
}

export interface ContratoIngresoRepository {
  save(contrato: ContratoIngreso): Promise<void>;
  findById(id: string): Promise<ContratoIngreso | null>;
  findAll(filter?: ContratoIngresoFilter): Promise<ContratoIngreso[]>;
  delete(id: string): Promise<void>;
}

export const CONTRATO_INGRESO_REPOSITORY = Symbol('CONTRATO_INGRESO_REPOSITORY');
