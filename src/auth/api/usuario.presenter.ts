import { Usuario } from '../domain/usuario';

export interface UsuarioPublico {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
}

export function toUsuarioPublico(usuario: Usuario): UsuarioPublico {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    activo: usuario.activo,
  };
}
