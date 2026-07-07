import { Column, Entity, PrimaryColumn } from 'typeorm';
import { AccountType } from '../../domain/account';

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
}
