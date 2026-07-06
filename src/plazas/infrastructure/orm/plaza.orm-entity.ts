import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('plazas')
export class PlazaOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar' })
  nombre: string;

  @Column({ type: 'varchar' })
  ubicacion: string;
}
