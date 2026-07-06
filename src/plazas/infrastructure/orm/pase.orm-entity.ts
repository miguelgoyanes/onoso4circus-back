import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { FechaOrmEntity } from './fecha.orm-entity';

@Entity('pases')
export class PaseOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @ManyToOne(() => FechaOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fecha_id' })
  fecha: FechaOrmEntity;

  @Column({ type: 'varchar', name: 'fecha_id' })
  fechaId: string;

  @Column({ type: 'varchar' })
  hora: string;

  @Column({ type: 'varchar', nullable: true })
  nombre?: string;
}
