import Decimal from 'decimal.js';
import type { ValueTransformer } from 'typeorm';

export const decimalNullableTransformer: ValueTransformer = {
  to: (value?: Decimal | null): string | null => (value == null ? null : value.toString()),
  from: (value: string | null): Decimal | undefined => (value == null ? undefined : new Decimal(value)),
};
