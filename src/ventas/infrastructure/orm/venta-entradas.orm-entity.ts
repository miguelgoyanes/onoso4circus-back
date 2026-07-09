import Decimal from 'decimal.js';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { OrigenVenta } from '../../domain/origen-venta';
import { TipoFiscal } from '../../domain/tipo-fiscal';
import { decimalTransformer } from '../../../accounting/infrastructure/orm/decimal.transformer';
import { decimalNullableTransformer } from './decimal-nullable.transformer';

@Entity('ventas_entradas')
export class VentaEntradasOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar', name: 'pase_id' })
  paseId: string;

  @Column({ type: 'varchar', name: 'fecha_id' })
  fechaId: string;

  @Column({ type: 'varchar', name: 'plaza_id' })
  plazaId: string;

  @Column({ type: 'varchar', name: 'tipo_entrada_id' })
  tipoEntradaId: string;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    name: 'precio_unitario_aplicado',
    transformer: decimalTransformer,
  })
  precioUnitarioAplicado: Decimal;

  @Column({ type: 'varchar', name: 'cuenta_cobro_id' })
  cuentaCobroId: string;

  @Column({ type: 'enum', enum: OrigenVenta })
  origen: OrigenVenta;

  @Column({ type: 'varchar', name: 'numero_entrada_desde', nullable: true })
  numeroEntradaDesde: string | null;

  @Column({ type: 'varchar', name: 'numero_entrada_hasta', nullable: true })
  numeroEntradaHasta: string | null;

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

  @Column({ type: 'varchar', name: 'journal_entry_id' })
  journalEntryId: string;

  // Default a nivel de BD (no solo en código) para que altere en caliente sin romper filas ya
  // existentes al añadir esta columna — mismo motivo que en VentaBarOrmEntity.creadoEn.
  @Column({ type: 'timestamptz', name: 'creado_en', default: () => 'now()' })
  creadoEn: Date;
}
