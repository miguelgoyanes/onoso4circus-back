import Decimal from 'decimal.js';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ProductoOrmEntity } from './producto.orm-entity';
import { TipoFiscal } from '../../domain/tipo-fiscal';
import { decimalTransformer } from '../../../accounting/infrastructure/orm/decimal.transformer';
import { decimalNullableTransformer } from './decimal-nullable.transformer';

@Entity('recepciones_stock')
export class RecepcionStockOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @ManyToOne(() => ProductoOrmEntity)
  @JoinColumn({ name: 'producto_id' })
  producto: ProductoOrmEntity;

  @Column({ type: 'varchar', name: 'producto_id' })
  productoId: string;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    name: 'coste_unitario',
    transformer: decimalTransformer,
  })
  costeUnitario: Decimal;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    name: 'base_imponible',
    transformer: decimalTransformer,
  })
  baseImponible: Decimal;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    name: 'importe_total',
    transformer: decimalTransformer,
  })
  importeTotal: Decimal;

  @Column({ type: 'timestamptz' })
  fecha: Date;

  @Column({ type: 'varchar', name: 'cuenta_origen_id' })
  cuentaOrigenId: string;

  @Column({ type: 'varchar', name: 'plaza_id', nullable: true })
  plazaId: string | null;

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
    name: 'importe_iva',
    nullable: true,
    transformer: decimalNullableTransformer,
  })
  importeIva: Decimal | null;

  @Column({ type: 'varchar', name: 'journal_entry_id' })
  journalEntryId: string;
}
