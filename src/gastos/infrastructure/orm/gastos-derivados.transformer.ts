import Decimal from 'decimal.js';
import type { ValueTransformer } from 'typeorm';
import { ConceptoGastoDerivado, GastoDerivado } from '../../domain/gasto';

interface GastoDerivadoJson {
  concepto: ConceptoGastoDerivado;
  importe: string;
}

export const gastosDerivadosTransformer: ValueTransformer = {
  to: (value: GastoDerivado[] | undefined): GastoDerivadoJson[] =>
    (value ?? []).map((d) => ({ concepto: d.concepto, importe: d.importe.toString() })),
  from: (value: GastoDerivadoJson[] | null): GastoDerivado[] =>
    (value ?? []).map((d) => ({ concepto: d.concepto, importe: new Decimal(d.importe) })),
};
