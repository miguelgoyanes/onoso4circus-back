import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TipoActividad } from '../../domain/tipo-actividad';
import { PlazaOrmEntity } from './plaza.orm-entity';
import { dateOnlyTransformer } from './date-only.transformer';

@Entity('fechas')
export class FechaOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @ManyToOne(() => PlazaOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plaza_id' })
  plaza: PlazaOrmEntity;

  @Column({ type: 'varchar', name: 'plaza_id' })
  plazaId: string;

  @Column({ type: 'date', transformer: dateOnlyTransformer })
  fecha: Date;

  @Column({ type: 'enum', enum: TipoActividad, name: 'tipo_actividad' })
  tipoActividad: TipoActividad;
}
