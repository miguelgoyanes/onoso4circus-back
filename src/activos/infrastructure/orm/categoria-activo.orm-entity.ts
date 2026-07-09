import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { AccountOrmEntity } from '../../../accounting/infrastructure/orm/account.orm-entity';

@Entity('categorias_activo')
export class CategoriaActivoOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar' })
  nombre: string;

  @ManyToOne(() => AccountOrmEntity)
  @JoinColumn({ name: 'cuenta_contable_id' })
  cuentaContable: AccountOrmEntity;

  @Column({ type: 'varchar', name: 'cuenta_contable_id' })
  cuentaContableId: string;

  @Column({ type: 'boolean', name: 'aplica_iva' })
  aplicaIva: boolean;

  @Column({ type: 'boolean', name: 'es_predefinida' })
  esPredefinida: boolean;
}
