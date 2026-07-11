import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('familias_elaborado')
export class FamiliaElaboradoOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar' })
  nombre: string;
}
