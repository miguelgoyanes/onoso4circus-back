import Decimal from 'decimal.js';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { RegimenEmpleado } from '../../domain/regimen-empleado';
import { decimalNullableTransformer } from './decimal-nullable.transformer';

@Entity('empleados')
export class EmpleadoOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar' })
  nombre: string;

  @Column({ type: 'varchar' })
  rol: string;

  @Column({ type: 'enum', enum: RegimenEmpleado })
  regimen: RegimenEmpleado;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    name: 'importe_referencia_dia',
    nullable: true,
    transformer: decimalNullableTransformer,
  })
  importeReferenciaDia: Decimal | null;
}
