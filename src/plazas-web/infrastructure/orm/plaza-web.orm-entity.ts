import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TipoVenta } from '../../domain/tipo-venta';
import { PlazaOrmEntity } from '../../../plazas/infrastructure/orm/plaza.orm-entity';

@Entity('plazas_web')
export class PlazaWebOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar' })
  ciudad: string;

  @Column({ type: 'varchar' })
  ubicacion: string;

  @Column({ type: 'varchar', name: 'maps_url' })
  mapsUrl: string;

  @Column({ type: 'varchar', nullable: true })
  descripcion: string | null;

  @Column({ type: 'varchar', name: 'cartel_url', nullable: true })
  cartelUrl: string | null;

  @Column({ type: 'varchar', name: 'entradas_url' })
  entradasUrl: string;

  @Column({ type: 'enum', enum: TipoVenta })
  venta: TipoVenta;

  @Column({ type: 'int', name: 'horas_antes', nullable: true })
  horasAntes: number | null;

  // Enlace opcional a la Plaza contable — entidades totalmente independientes por diseño,
  // por eso onDelete: 'SET NULL' en vez de CASCADE: si se borra la plaza contable, este
  // enlace simplemente se limpia en vez de arrastrar el borrado de la plaza web.
  @ManyToOne(() => PlazaOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'plaza_id' })
  plaza: PlazaOrmEntity | null;

  @Column({ type: 'varchar', name: 'plaza_id', nullable: true })
  plazaId: string | null;
}
