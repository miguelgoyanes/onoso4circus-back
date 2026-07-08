import Decimal from 'decimal.js';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { EstadoPagoGasto, GastoPersonalDetalle } from '../../domain/gasto';
import { TipoFiscal } from '../../domain/tipo-fiscal';
import { CategoriaGastoOrmEntity } from './categoria-gasto.orm-entity';
import { PlazaOrmEntity } from '../../../plazas/infrastructure/orm/plaza.orm-entity';
import { FechaOrmEntity } from '../../../plazas/infrastructure/orm/fecha.orm-entity';
import { PaseOrmEntity } from '../../../plazas/infrastructure/orm/pase.orm-entity';
import { decimalTransformer } from '../../../accounting/infrastructure/orm/decimal.transformer';
import { decimalNullableTransformer } from './decimal-nullable.transformer';
import { dateOnlyTransformer } from './date-only.transformer';
import { gastoDetalleTransformer } from './gasto-detalle.transformer';
import { stringArrayTransformer } from './string-array.transformer';

@Entity('gastos')
export class GastoOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @ManyToOne(() => CategoriaGastoOrmEntity)
  @JoinColumn({ name: 'categoria_id' })
  categoria: CategoriaGastoOrmEntity;

  @Column({ type: 'varchar', name: 'categoria_id' })
  categoriaId: string;

  @Column({ type: 'date', transformer: dateOnlyTransformer })
  fecha: Date;

  @Column({ type: 'varchar' })
  descripcion: string;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    transformer: decimalTransformer,
  })
  importe: Decimal;

  @Column({ type: 'enum', enum: EstadoPagoGasto, name: 'estado_pago' })
  estadoPago: EstadoPagoGasto;

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

  @Column({ type: 'varchar', name: 'empleado_id', nullable: true })
  empleadoId: string | null;

  @Column({ type: 'varchar', name: 'cuenta_pago_id', nullable: true })
  cuentaPagoId: string | null;

  @Column({ type: 'enum', enum: TipoFiscal, name: 'tipo_fiscal', nullable: true })
  tipoFiscal: TipoFiscal | null;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    name: 'iva_percent',
    nullable: true,
    transformer: decimalNullableTransformer,
  })
  ivaPercent: Decimal | null;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    name: 'base_imponible',
    nullable: true,
    transformer: decimalNullableTransformer,
  })
  baseImponible: Decimal | null;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    name: 'importe_iva',
    nullable: true,
    transformer: decimalNullableTransformer,
  })
  importeIva: Decimal | null;

  @Column({
    type: 'jsonb',
    default: () => "'[]'",
    transformer: gastoDetalleTransformer,
  })
  detalle: GastoPersonalDetalle[];

  @Column({
    type: 'jsonb',
    name: 'journal_entry_ids',
    default: () => "'[]'",
    transformer: stringArrayTransformer,
  })
  journalEntryIds: string[];
}
