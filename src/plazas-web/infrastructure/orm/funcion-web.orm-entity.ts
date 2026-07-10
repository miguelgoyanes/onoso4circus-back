import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { PlazaWebOrmEntity } from './plaza-web.orm-entity';
import { dateOnlyTransformer } from '../../../plazas/infrastructure/orm/date-only.transformer';

@Entity('funciones_web')
export class FuncionWebOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @ManyToOne(() => PlazaWebOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plaza_web_id' })
  plazaWeb: PlazaWebOrmEntity;

  @Column({ type: 'varchar', name: 'plaza_web_id' })
  plazaWebId: string;

  @Column({ type: 'date', transformer: dateOnlyTransformer })
  fecha: Date;

  // Lista de horas "HH:MM" del mismo día — no tiene identidad ni comportamiento propio
  // (a diferencia de Pase en plazas/), así que no se modela como tabla aparte.
  @Column({ type: 'simple-array' })
  horarios: string[];

  @Column({ type: 'int', nullable: true })
  descuento: number | null;

  @Column({ type: 'varchar', name: 'descuento_descripcion', nullable: true })
  descuentoDescripcion: string | null;
}
