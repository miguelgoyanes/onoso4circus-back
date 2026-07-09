import { Column, Entity, PrimaryColumn } from 'typeorm';
import { AccountType, TipoCuentaDinero } from '../../domain/account';

@Entity('accounts')
export class AccountOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'enum', enum: AccountType })
  type: AccountType;

  @Column({ type: 'varchar', unique: true })
  code: string;

  @Column({ type: 'boolean', default: false })
  esCuentaDeDinero: boolean;

  @Column({ type: 'enum', enum: TipoCuentaDinero, name: 'tipo_cuenta_dinero', nullable: true })
  tipoCuentaDinero: TipoCuentaDinero | null;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @Column({ type: 'boolean', name: 'usable_en_taquilla', default: false })
  usableEnTaquilla: boolean;

  @Column({ type: 'boolean', name: 'usable_en_bar', default: false })
  usableEnBar: boolean;
}
