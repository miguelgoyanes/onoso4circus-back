import { Usuario } from '../domain/usuario';

export interface UsuarioRepository {
  save(usuario: Usuario): Promise<void>;
  findById(id: string): Promise<Usuario | null>;
  findByEmail(email: string): Promise<Usuario | null>;
  countActiveAdmins(): Promise<number>;
}

export const USUARIO_REPOSITORY = Symbol('USUARIO_REPOSITORY');
