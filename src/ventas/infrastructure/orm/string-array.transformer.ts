import type { ValueTransformer } from 'typeorm';

export const stringArrayTransformer: ValueTransformer = {
  to: (value: string[] | undefined): string[] => value ?? [],
  from: (value: string[] | null): string[] => value ?? [],
};
