import Decimal from 'decimal.js';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TipoFiscal } from '../../domain/tipo-fiscal';
import { CategoriaActivoOrmEntity } from './categoria-activo.orm-entity';
import { decimalTransformer } from '../../../accounting/infrastructure/orm/decimal.transformer';
import { decimalNullableTransformer } from './decimal-nullable.transformer';
import { dateOnlyNullableTransformer, dateOnlyTransformer } from './date-only.transformer';

@Entity('activos')
export class ActivoOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @ManyToOne(() => CategoriaActivoOrmEntity)
  @JoinColumn({ name: 'categoria_id' })
  categoria: CategoriaActivoOrmEntity;

  @Column({ type: 'varchar', name: 'categoria_id' })
  categoriaId: string;

  @Column({ type: 'varchar' })
  nombre: string;

  @Column({ type: 'date', name: 'fecha_compra', transformer: dateOnlyTransformer })
  fechaCompra: Date;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: decimalTransformer })
  coste: Decimal;

  @Column({ type: 'varchar', name: 'cuenta_pago_id' })
  cuentaPagoId: string;

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

  @Column({ type: 'int', name: 'vida_util_anios' })
  vidaUtilAnios: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'valor_residual', transformer: decimalTransformer })
  valorResidual: Decimal;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    name: 'amortizacion_acumulada',
    default: 0,
    transformer: decimalTransformer,
  })
  amortizacionAcumulada: Decimal;

  @Column({ type: 'date', name: 'ultima_amortizacion_registrada_en', nullable: true, transformer: dateOnlyNullableTransformer })
  ultimaAmortizacionRegistradaEn: Date | null;

  @Column({ type: 'varchar', name: 'journal_entry_compra_id' })
  journalEntryCompraId: string;
}
