import Decimal from 'decimal.js';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ProductoOrmEntity } from './producto.orm-entity';
import { TipoAjusteStock } from '../../domain/tipo-ajuste-stock';
import { decimalTransformer } from '../../../accounting/infrastructure/orm/decimal.transformer';

@Entity('ajustes_stock')
export class AjusteStockOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @ManyToOne(() => ProductoOrmEntity)
  @JoinColumn({ name: 'producto_id' })
  producto: ProductoOrmEntity;

  @Column({ type: 'varchar', name: 'producto_id' })
  productoId: string;

  @Column({ type: 'enum', enum: TipoAjusteStock })
  tipo: TipoAjusteStock;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    name: 'coste_unitario_aplicado',
    transformer: decimalTransformer,
  })
  costeUnitarioAplicado: Decimal;

  @Column({ type: 'varchar', name: 'plaza_id', nullable: true })
  plazaId: string | null;

  @Column({ type: 'varchar', name: 'fecha_id', nullable: true })
  fechaId: string | null;

  @Column({ type: 'varchar', name: 'pase_id', nullable: true })
  paseId: string | null;

  @Column({ type: 'varchar', name: 'journal_entry_id' })
  journalEntryId: string;

  @Column({ type: 'timestamptz' })
  fecha: Date;
}
