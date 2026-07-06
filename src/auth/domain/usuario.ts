export enum Rol {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  OPERADOR = 'OPERADOR',
}

// El OWNER tiene todos los permisos de ADMIN (y de OPERADOR); ADMIN y OPERADOR
// solo tienen los suyos propios. Se usa en RolesGuard para que un endpoint
// marcado @Roles(Rol.ADMIN) también acepte al OWNER sin tener que listarlo
// explícitamente en cada controller.
export const ROLES_EFECTIVOS: Record<Rol, Rol[]> = {
  [Rol.OWNER]: [Rol.OWNER, Rol.ADMIN, Rol.OPERADOR],
  [Rol.ADMIN]: [Rol.ADMIN],
  [Rol.OPERADOR]: [Rol.OPERADOR],
};

export class Usuario {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
    public readonly username: string,
    public readonly passwordHash: string,
    public readonly rol: Rol,
    public readonly activo: boolean,
  ) {}

  public conRol(nuevoRol: Rol): Usuario {
    return new Usuario(
      this.id,
      this.nombre,
      this.username,
      this.passwordHash,
      nuevoRol,
      this.activo,
    );
  }

  public conPasswordHash(nuevoPasswordHash: string): Usuario {
    return new Usuario(
      this.id,
      this.nombre,
      this.username,
      nuevoPasswordHash,
      this.rol,
      this.activo,
    );
  }

  public desactivado(): Usuario {
    return new Usuario(this.id, this.nombre, this.username, this.passwordHash, this.rol, false);
  }

  public activado(): Usuario {
    return new Usuario(this.id, this.nombre, this.username, this.passwordHash, this.rol, true);
  }
}
