import Decimal from 'decimal.js';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { AccountOrmEntity } from './account.orm-entity';
import { JournalEntryOrmEntity } from './journal-entry.orm-entity';
import { decimalTransformer } from './decimal.transformer';

@Entity('journal_lines')
export class JournalLineOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @ManyToOne(() => JournalEntryOrmEntity, (entry) => entry.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'journal_entry_id' })
  journalEntry: JournalEntryOrmEntity;

  @ManyToOne(() => AccountOrmEntity, { eager: true })
  @JoinColumn({ name: 'account_id' })
  account: AccountOrmEntity;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0, transformer: decimalTransformer })
  debit: Decimal;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0, transformer: decimalTransformer })
  credit: Decimal;

  @Column({ type: 'varchar', name: 'plaza_id', nullable: true })
  plazaId?: string;

  @Column({ type: 'varchar', name: 'fecha_id', nullable: true })
  fechaId?: string;

  @Column({ type: 'varchar', name: 'pase_id', nullable: true })
  paseId?: string;

  @Column({ type: 'varchar', name: 'category_tag', nullable: true })
  categoryTag?: string;

  @Column({ type: 'varchar', name: 'empleado_id', nullable: true })
  empleadoId?: string;
}
