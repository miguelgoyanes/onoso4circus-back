import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_EFECTIVOS, Rol } from '../domain/usuario';
import { ROLES_KEY } from './roles.decorator';
import { AuthenticatedUser } from './authenticated-user';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  public canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Rol[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    // El OWNER hereda todo lo que puede hacer un ADMIN (ver ROLES_EFECTIVOS en el dominio),
    // así que no hace falta listarlo aparte en cada @Roles(...) del controller.
    const rolesEfectivosDelUsuario = ROLES_EFECTIVOS[request.user.rol];
    return requiredRoles.some((rolRequerido) => rolesEfectivosDelUsuario.includes(rolRequerido));
  }
}
