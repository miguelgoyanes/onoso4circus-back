import { randomUUID } from 'crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Rol, Usuario } from '../domain/usuario';
import { PASSWORD_HASHER } from './password-hasher';
import type { PasswordHasher } from './password-hasher';
import { USUARIO_REPOSITORY } from './usuario.repository';
import type { UsuarioRepository } from './usuario.repository';

@Injectable()
export class UsuarioService {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly repository: UsuarioRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  public async crear(
    nombre: string,
    email: string,
    password: string,
    rol: Rol,
  ): Promise<Usuario> {
    const existente = await this.repository.findByEmail(email);
    if (existente) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const passwordHash = await this.hasher.hash(password);
    const usuario = new Usuario(randomUUID(), nombre, email, passwordHash, rol, true);
    await this.repository.save(usuario);
    return usuario;
  }

  public async desactivar(usuarioId: string): Promise<Usuario> {
    const usuario = await this.buscarOFallar(usuarioId);
    await this.rechazarSiEsElUltimoAdminActivo(usuario, 'desactivar');

    const actualizado = usuario.desactivado();
    await this.repository.save(actualizado);
    return actualizado;
  }

  public async cambiarRol(usuarioId: string, nuevoRol: Rol): Promise<Usuario> {
    const usuario = await this.buscarOFallar(usuarioId);
    if (nuevoRol !== Rol.ADMIN) {
      await this.rechazarSiEsElUltimoAdminActivo(usuario, 'cambiar de rol a');
    }

    const actualizado = usuario.conRol(nuevoRol);
    await this.repository.save(actualizado);
    return actualizado;
  }

  private async buscarOFallar(usuarioId: string): Promise<Usuario> {
    const usuario = await this.repository.findById(usuarioId);
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return usuario;
  }

  private async rechazarSiEsElUltimoAdminActivo(
    usuario: Usuario,
    accion: string,
  ): Promise<void> {
    if (usuario.rol !== Rol.ADMIN || !usuario.activo) return;

    const adminsActivos = await this.repository.countActiveAdmins();
    if (adminsActivos <= 1) {
      throw new ForbiddenException(`No se puede ${accion} al último ADMIN activo`);
    }
  }
}
