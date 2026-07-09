import Decimal from 'decimal.js';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { EstadoCobro } from '../../domain/estado-cobro';
import { TipoFiscal } from '../../domain/tipo-fiscal';
import { decimalTransformer } from '../../../accounting/infrastructure/orm/decimal.transformer';
import { decimalNullableTransformer } from './decimal-nullable.transformer';
import { dateOnlyTransformer } from './date-only.transformer';
import { stringArrayTransformer } from './string-array.transformer';

@Entity('contratos_ingreso')
export class ContratoIngresoOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar' })
  cliente: string;

  @Column({ type: 'varchar' })
  concepto: string;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    transformer: decimalTransformer,
  })
  importe: Decimal;

  @Column({ type: 'date', transformer: dateOnlyTransformer })
  fecha: Date;

  @Column({ type: 'varchar', name: 'plaza_id', nullable: true })
  plazaId: string | null;

  @Column({ type: 'varchar', name: 'fecha_id', nullable: true })
  fechaId: string | null;

  @Column({ type: 'varchar', name: 'pase_id', nullable: true })
  paseId: string | null;

  @Column({ type: 'enum', enum: EstadoCobro, name: 'estado_cobro' })
  estadoCobro: EstadoCobro;

  @Column({ type: 'varchar', name: 'cuenta_destino_id', nullable: true })
  cuentaDestinoId: string | null;

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
    name: 'journal_entry_ids',
    default: () => "'[]'",
    transformer: stringArrayTransformer,
  })
  journalEntryIds: string[];
}
