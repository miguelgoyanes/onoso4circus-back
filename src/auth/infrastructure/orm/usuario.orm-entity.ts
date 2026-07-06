import { Column, Entity, PrimaryColumn } from 'typeorm';
import { Rol } from '../../domain/usuario';

@Entity('usuarios')
export class UsuarioOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar' })
  nombre: string;

  @Column({ type: 'varchar', unique: true })
  username: string;

  @Column({ type: 'varchar', name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'enum', enum: Rol })
  rol: Rol;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
