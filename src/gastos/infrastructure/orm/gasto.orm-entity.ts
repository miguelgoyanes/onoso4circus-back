import Decimal from 'decimal.js';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import {
  CategoriaGastoGeneral,
  CategoriaGastoPlaza,
  EstadoPagoGasto,
  GastoDerivado,
  TipoGasto,
} from '../../domain/gasto';
import { PlazaOrmEntity } from '../../../plazas/infrastructure/orm/plaza.orm-entity';
import { FechaOrmEntity } from '../../../plazas/infrastructure/orm/fecha.orm-entity';
import { PaseOrmEntity } from '../../../plazas/infrastructure/orm/pase.orm-entity';
import { decimalTransformer } from '../../../accounting/infrastructure/orm/decimal.transformer';
import { decimalNullableTransformer } from './decimal-nullable.transformer';
import { dateOnlyTransformer } from './date-only.transformer';
import { gastosDerivadosTransformer } from './gastos-derivados.transformer';

@Entity('gastos')
export class GastoOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'enum', enum: TipoGasto })
  tipo: TipoGasto;

  @Column({ type: 'date', transformer: dateOnlyTransformer })
  fecha: Date;

  @Column({ type: 'varchar' })
  descripcion: string;

  @Column({ type: 'enum', enum: EstadoPagoGasto, name: 'estado_pago' })
  estadoPago: EstadoPagoGasto;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    name: 'importe_total',
    transformer: decimalTransformer,
  })
  importeTotal: Decimal;

  @ManyToOne(() => PlazaOrmEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'plaza_id' })
  plaza: PlazaOrmEntity | null;

  @Column({ type: 'varchar', name: 'plaza_id', nullable: true })
  plazaId: string | null;

  @ManyToOne(() => FechaOrmEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'fecha_id' })
  fechaRef: FechaOrmEntity | null;

  @Column({ type: 'varchar', name: 'fecha_id', nullable: true })
  fechaId: string | null;

  @ManyToOne(() => PaseOrmEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'pase_id' })
  pase: PaseOrmEntity | null;

  @Column({ type: 'varchar', name: 'pase_id', nullable: true })
  paseId: string | null;

  // tipo = PERSONAL
  @Column({ type: 'varchar', name: 'empleado_id', nullable: true })
  empleadoId: string | null;

  @Column({ type: 'varchar', name: 'asignacion_id', nullable: true })
  asignacionId: string | null;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    name: 'importe_salario',
    nullable: true,
    transformer: decimalNullableTransformer,
  })
  importeSalario: Decimal | null;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    name: 'coste_ss',
    nullable: true,
    transformer: decimalNullableTransformer,
  })
  costeSs: Decimal | null;

  @Column({
    type: 'jsonb',
    name: 'gastos_derivados',
    default: () => "'[]'",
    transformer: gastosDerivadosTransformer,
  })
  gastosDerivados: GastoDerivado[];

  // tipo = PLAZA
  @Column({ type: 'enum', enum: CategoriaGastoPlaza, name: 'categoria_plaza', nullable: true })
  categoriaPlaza: CategoriaGastoPlaza | null;

  // tipo = GENERAL
  @Column({ type: 'enum', enum: CategoriaGastoGeneral, name: 'categoria_general', nullable: true })
  categoriaGeneral: CategoriaGastoGeneral | null;

  // tipo = PLAZA | GENERAL
  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
    transformer: decimalNullableTransformer,
  })
  importe: Decimal | null;
}
