import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('vinculaciones_insumo')
export class VinculacionInsumoOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar', name: 'insumo_id' })
  insumoId: string;

  @Column({ type: 'varchar', name: 'familia_elaborado_id' })
  familiaElaboradoId: string;
}
