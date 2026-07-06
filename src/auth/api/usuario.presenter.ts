import { Usuario } from '../domain/usuario';

export interface UsuarioPublico {
  id: string;
  nombre: string;
  username: string;
  rol: string;
  activo: boolean;
}

export function toUsuarioPublico(usuario: Usuario): UsuarioPublico {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    username: usuario.username,
    rol: usuario.rol,
    activo: usuario.activo,
  };
}
