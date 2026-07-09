import Decimal from 'decimal.js';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { decimalTransformer } from '../../../accounting/infrastructure/orm/decimal.transformer';

@Entity('ajustes_arqueo')
export class AjusteArqueoOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar', name: 'cuenta_id' })
  cuentaId: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'importe_teorico', transformer: decimalTransformer })
  importeTeorico: Decimal;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'importe_real', transformer: decimalTransformer })
  importeReal: Decimal;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: decimalTransformer })
  diferencia: Decimal;

  @Column({ type: 'varchar', name: 'journal_entry_id', nullable: true })
  journalEntryId: string | null;

  @Column({ type: 'varchar', nullable: true })
  concepto: string | null;

  @Column({ type: 'timestamptz' })
  fecha: Date;
}
