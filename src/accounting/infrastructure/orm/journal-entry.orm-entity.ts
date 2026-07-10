import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { JournalLineOrmEntity } from './journal-line.orm-entity';

@Entity('journal_entries')
export class JournalEntryOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'timestamptz' })
  date: Date;

  @Column({ type: 'varchar' })
  description: string;

  // Desempate para ordenar asientos del mismo día por orden real de creación — id es un
  // UUID aleatorio, no sirve para ordenar cronológicamente.
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => JournalLineOrmEntity, (line) => line.journalEntry, {
    cascade: true,
  })
  lines: JournalLineOrmEntity[];
}
