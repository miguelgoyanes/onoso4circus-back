import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { AccountOrmEntity } from '../../../accounting/infrastructure/orm/account.orm-entity';

@Entity('categorias_gasto')
export class CategoriaGastoOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar' })
  nombre: string;

  @ManyToOne(() => AccountOrmEntity, { nullable: true })
  @JoinColumn({ name: 'cuenta_contable_id' })
  cuentaContable: AccountOrmEntity | null;

  @Column({ type: 'varchar', name: 'cuenta_contable_id', nullable: true })
  cuentaContableId: string | null;

  @Column({ type: 'boolean', name: 'requiere_empleado' })
  requiereEmpleado: boolean;

  @Column({ type: 'boolean', name: 'es_pago_personal' })
  esPagoPersonal: boolean;

  @Column({ type: 'boolean', name: 'aplica_iva' })
  aplicaIva: boolean;

  @Column({ type: 'boolean', name: 'es_predefinida' })
  esPredefinida: boolean;
}
