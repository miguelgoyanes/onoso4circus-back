import { Rol } from '../domain/usuario';

export interface AuthenticatedUser {
  userId: string;
  username: string;
  rol: Rol;
}
