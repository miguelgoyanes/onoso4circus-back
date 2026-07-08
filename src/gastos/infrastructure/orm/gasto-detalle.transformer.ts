import Decimal from 'decimal.js';
import type { ValueTransformer } from 'typeorm';
import { ConceptoPersonal } from '../../domain/concepto-personal';
import { GastoPersonalDetalle } from '../../domain/gasto';

interface GastoPersonalDetalleJson {
  concepto: ConceptoPersonal;
  importe: string;
}

export const gastoDetalleTransformer: ValueTransformer = {
  to: (value: GastoPersonalDetalle[] | undefined): GastoPersonalDetalleJson[] =>
    (value ?? []).map((d) => ({ concepto: d.concepto, importe: d.importe.toString() })),
  from: (value: GastoPersonalDetalleJson[] | null): GastoPersonalDetalle[] =>
    (value ?? []).map((d) => new GastoPersonalDetalle(d.concepto, new Decimal(d.importe))),
};
