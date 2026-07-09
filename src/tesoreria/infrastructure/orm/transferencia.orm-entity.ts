import Decimal from 'decimal.js';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { decimalTransformer } from '../../../accounting/infrastructure/orm/decimal.transformer';

@Entity('transferencias')
export class TransferenciaOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar', name: 'origen_id' })
  origenId: string;

  @Column({ type: 'varchar', name: 'destino_id' })
  destinoId: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: decimalTransformer })
  importe: Decimal;

  @Column({ type: 'varchar', nullable: true })
  concepto: string | null;

  @Column({ type: 'varchar', name: 'journal_entry_id' })
  journalEntryId: string;

  @Column({ type: 'timestamptz' })
  fecha: Date;
}
