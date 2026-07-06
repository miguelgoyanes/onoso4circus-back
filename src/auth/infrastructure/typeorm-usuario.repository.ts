import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rol, Usuario } from '../domain/usuario';
import { UsuarioRepository } from '../application/usuario.repository';
import { UsuarioOrmEntity } from './orm/usuario.orm-entity';

function toDomain(orm: UsuarioOrmEntity): Usuario {
  return new Usuario(orm.id, orm.nombre, orm.email, orm.passwordHash, orm.rol, orm.activo);
}

@Injectable()
export class TypeOrmUsuarioRepository implements UsuarioRepository {
  constructor(
    @InjectRepository(UsuarioOrmEntity)
    private readonly repo: Repository<UsuarioOrmEntity>,
  ) {}

  public async save(usuario: Usuario): Promise<void> {
    await this.repo.save({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      passwordHash: usuario.passwordHash,
      rol: usuario.rol,
      activo: usuario.activo,
    });
  }

  public async findById(id: string): Promise<Usuario | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findByEmail(email: string): Promise<Usuario | null> {
    const orm = await this.repo.findOneBy({ email });
    return orm ? toDomain(orm) : null;
  }

  public async countActiveAdmins(): Promise<number> {
    return this.repo.countBy({ rol: Rol.ADMIN, activo: true });
  }
}
