import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { JournalLineOrmEntity } from './journal-line.orm-entity';

@Entity('journal_entries')
export class JournalEntryOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'timestamptz' })
  date: Date;

  @Column({ type: 'varchar' })
  description: string;

  @OneToMany(() => JournalLineOrmEntity, (line) => line.journalEntry, {
    cascade: true,
  })
  lines: JournalLineOrmEntity[];
}
