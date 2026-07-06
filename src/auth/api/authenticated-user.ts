import { Rol } from '../domain/usuario';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  rol: Rol;
}
