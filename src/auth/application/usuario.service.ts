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

  public async listar(): Promise<Usuario[]> {
    return this.repository.findAll();
  }

  public async crear(
    nombre: string,
    username: string,
    password: string,
    rol: Rol,
  ): Promise<Usuario> {
    if (rol === Rol.OWNER) {
      throw new ForbiddenException(
        'El OWNER no se puede crear desde aquí — solo existe uno, sembrado directamente en la base de datos',
      );
    }

    const existente = await this.repository.findByUsername(username);
    if (existente) {
      throw new ConflictException('Ya existe un usuario con ese nombre de usuario');
    }

    const passwordHash = await this.hasher.hash(password);
    const usuario = new Usuario(randomUUID(), nombre, username, passwordHash, rol, true);
    await this.repository.save(usuario);
    return usuario;
  }

  public async desactivar(usuarioId: string): Promise<Usuario> {
    const usuario = await this.buscarOFallar(usuarioId);
    this.rechazarSiEsOwner(usuario, 'No se puede desactivar al OWNER');
    await this.rechazarSiEsElUltimoAdminActivo(usuario, 'desactivar');

    const actualizado = usuario.desactivado();
    await this.repository.save(actualizado);
    return actualizado;
  }

  public async reactivar(usuarioId: string): Promise<Usuario> {
    const usuario = await this.buscarOFallar(usuarioId);
    const actualizado = usuario.activado();
    await this.repository.save(actualizado);
    return actualizado;
  }

  public async cambiarRol(usuarioId: string, nuevoRol: Rol): Promise<Usuario> {
    const usuario = await this.buscarOFallar(usuarioId);
    this.rechazarSiEsOwner(usuario, 'No se puede cambiar el rol del OWNER');
    if (nuevoRol === Rol.OWNER) {
      throw new ForbiddenException(
        'No se puede promocionar a nadie a OWNER — solo existe uno, sembrado directamente en la base de datos',
      );
    }
    if (nuevoRol !== Rol.ADMIN) {
      await this.rechazarSiEsElUltimoAdminActivo(usuario, 'cambiar de rol a');
    }

    const actualizado = usuario.conRol(nuevoRol);
    await this.repository.save(actualizado);
    return actualizado;
  }

  public async resetearPassword(usuarioId: string, nuevaPassword: string): Promise<Usuario> {
    const usuario = await this.buscarOFallar(usuarioId);
    const nuevoHash = await this.hasher.hash(nuevaPassword);
    const actualizado = usuario.conPasswordHash(nuevoHash);
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

  private rechazarSiEsOwner(usuario: Usuario, mensaje: string): void {
    if (usuario.rol === Rol.OWNER) {
      throw new ForbiddenException(mensaje);
    }
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
