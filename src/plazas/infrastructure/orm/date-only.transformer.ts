import type { ValueTransformer } from 'typeorm';

// Postgres 'date' no lleva hora; TypeORM lo entrega como string 'YYYY-MM-DD'.
export const dateOnlyTransformer: ValueTransformer = {
  to: (value: Date): string => value.toISOString().slice(0, 10),
  from: (value: string): Date => new Date(`${value}T00:00:00.000Z`),
};
