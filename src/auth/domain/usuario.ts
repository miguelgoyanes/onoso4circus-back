export enum Rol {
  ADMIN = 'ADMIN',
  OPERADOR = 'OPERADOR',
}

export class Usuario {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly rol: Rol,
    public readonly activo: boolean,
  ) {}

  public conRol(nuevoRol: Rol): Usuario {
    return new Usuario(this.id, this.nombre, this.email, this.passwordHash, nuevoRol, this.activo);
  }

  public desactivado(): Usuario {
    return new Usuario(this.id, this.nombre, this.email, this.passwordHash, this.rol, false);
  }
}
