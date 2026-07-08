import { Column, Entity, PrimaryColumn } from 'typeorm';
import { TipoPlaza } from '../../domain/tipo-plaza';

@Entity('plazas')
export class PlazaOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar' })
  nombre: string;

  @Column({ type: 'varchar' })
  ubicacion: string;

  @Column({ type: 'enum', enum: TipoPlaza, name: 'tipo_plaza', default: TipoPlaza.CON_CIRCO })
  tipoPlaza: TipoPlaza;
}
