import { Usuario } from '../domain/usuario';

export interface UsuarioRepository {
  save(usuario: Usuario): Promise<void>;
  findById(id: string): Promise<Usuario | null>;
  findByUsername(username: string): Promise<Usuario | null>;
  findAll(): Promise<Usuario[]>;
  countActiveAdmins(): Promise<number>;
  existeOwner(): Promise<boolean>;
}

export const USUARIO_REPOSITORY = Symbol('USUARIO_REPOSITORY');
