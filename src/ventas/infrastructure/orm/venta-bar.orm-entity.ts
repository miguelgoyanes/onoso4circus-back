import Decimal from 'decimal.js';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { VentaBarLinea } from '../../domain/venta-bar';
import { TipoFiscal } from '../../domain/tipo-fiscal';
import { decimalTransformer } from '../../../accounting/infrastructure/orm/decimal.transformer';
import { decimalNullableTransformer } from './decimal-nullable.transformer';
import { ventaBarLineaTransformer } from './venta-bar-linea.transformer';

@Entity('ventas_bar')
export class VentaBarOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar', name: 'pase_id' })
  paseId: string;

  @Column({ type: 'varchar', name: 'fecha_id' })
  fechaId: string;

  @Column({ type: 'varchar', name: 'plaza_id' })
  plazaId: string;

  @Column({ type: 'varchar', name: 'cuenta_cobro_id' })
  cuentaCobroId: string;

  // Default a nivel de BD (no solo en código) para que altere en caliente sin romper filas ya
  // existentes al añadir esta columna — mismo motivo que el default de `lineas` de abajo.
  @Column({ type: 'timestamptz', name: 'creado_en', default: () => 'now()' })
  creadoEn: Date;

  @Column({ type: 'jsonb', default: () => "'[]'", transformer: ventaBarLineaTransformer })
  lineas: VentaBarLinea[];

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'importe_total', transformer: decimalTransformer })
  importeTotal: Decimal;

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
}
