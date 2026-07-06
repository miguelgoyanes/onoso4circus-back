import Decimal from 'decimal.js';
import type { ValueTransformer } from 'typeorm';

export const decimalTransformer: ValueTransformer = {
  to: (value: Decimal): string => value.toString(),
  from: (value: string): Decimal => new Decimal(value),
};
