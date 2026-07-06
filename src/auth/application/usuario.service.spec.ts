import { randomUUID } from 'crypto';
import { Rol, Usuario } from '../domain/usuario';
import { PasswordHasher } from './password-hasher';
import { UsuarioRepository } from './usuario.repository';
import { UsuarioService } from './usuario.service';

class InMemoryUsuarioRepository implements UsuarioRepository {
  private readonly usuarios = new Map<string, Usuario>();

  async save(usuario: Usuario): Promise<void> {
    this.usuarios.set(usuario.id, usuario);
  }

  async findById(id: string): Promise<Usuario | null> {
    return this.usuarios.get(id) ?? null;
  }

  async findByUsername(username: string): Promise<Usuario | null> {
    return [...this.usuarios.values()].find((u) => u.username === username) ?? null;
  }

  async findAll(): Promise<Usuario[]> {
    return [...this.usuarios.values()];
  }

  async countActiveAdmins(): Promise<number> {
    return [...this.usuarios.values()].filter((u) => u.rol === Rol.ADMIN && u.activo).length;
  }

  async existeOwner(): Promise<boolean> {
    return [...this.usuarios.values()].some((u) => u.rol === Rol.OWNER);
  }

  // Solo para los tests que necesitan sembrar un OWNER directamente,
  // sin pasar por UsuarioService.crear() (que lo rechaza a propósito).
  async sembrarOwner(nombre: string, username: string): Promise<Usuario> {
    const owner = new Usuario(randomUUID(), nombre, username, 'hashed:x', Rol.OWNER, true);
    this.usuarios.set(owner.id, owner);
    return owner;
  }
}

class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }
  async compare(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`;
  }
}

describe('UsuarioService', () => {
  let repository: InMemoryUsuarioRepository;
  let service: UsuarioService;

  beforeEach(() => {
    repository = new InMemoryUsuarioRepository();
    service = new UsuarioService(repository, new FakePasswordHasher());
  });

  it('lista todos los usuarios creados', async () => {
    await service.crear('Juan', 'juan', 'secreto123', Rol.OPERADOR);
    await service.crear('Ana', 'ana', 'secreto123', Rol.ADMIN);

    const usuarios = await service.listar();
    expect(usuarios).toHaveLength(2);
    expect(usuarios.map((u) => u.username).sort()).toEqual(['ana', 'juan']);
  });

  it('crea un usuario con la contraseña hasheada, nunca en texto plano', async () => {
    const usuario = await service.crear('Juan', 'juan', 'secreto123', Rol.OPERADOR);
    expect(usuario.passwordHash).toBe('hashed:secreto123');
    expect(usuario.activo).toBe(true);
  });

  it('rechaza crear un usuario con un username ya existente', async () => {
    await service.crear('Juan', 'juan', 'secreto123', Rol.OPERADOR);
    await expect(service.crear('Otro Juan', 'juan', 'otraclave123', Rol.OPERADOR)).rejects.toThrow(
      /ya existe/i,
    );
  });

  it('NUNCA permite crear un usuario con rol OWNER', async () => {
    await expect(service.crear('Impostor', 'impostor', 'secreto123', Rol.OWNER)).rejects.toThrow(
      /no se puede crear desde aquí/i,
    );
  });

  it('permite desactivar a un OPERADOR sin restricciones', async () => {
    const operador = await service.crear('Pepe', 'pepe', 'secreto123', Rol.OPERADOR);
    const desactivado = await service.desactivar(operador.id);
    expect(desactivado.activo).toBe(false);
  });

  it('permite reactivar a un usuario desactivado', async () => {
    const operador = await service.crear('Pepe', 'pepe', 'secreto123', Rol.OPERADOR);
    await service.desactivar(operador.id);

    const reactivado = await service.reactivar(operador.id);
    expect(reactivado.activo).toBe(true);
  });

  it('permite desactivar a un ADMIN si quedan otros ADMIN activos', async () => {
    const admin1 = await service.crear('Admin1', 'admin1', 'secreto123', Rol.ADMIN);
    await service.crear('Admin2', 'admin2', 'secreto123', Rol.ADMIN);

    const desactivado = await service.desactivar(admin1.id);
    expect(desactivado.activo).toBe(false);
  });

  it('NUNCA permite desactivar al último ADMIN activo', async () => {
    const unicoAdmin = await service.crear('Unico', 'unico', 'secreto123', Rol.ADMIN);
    await expect(service.desactivar(unicoAdmin.id)).rejects.toThrow(/último ADMIN activo/);

    const sigueActivo = await repository.findById(unicoAdmin.id);
    expect(sigueActivo?.activo).toBe(true);
  });

  it('NUNCA permite degradar a OPERADOR al último ADMIN activo', async () => {
    const unicoAdmin = await service.crear('Unico', 'unico', 'secreto123', Rol.ADMIN);
    await expect(service.cambiarRol(unicoAdmin.id, Rol.OPERADOR)).rejects.toThrow(
      /último ADMIN activo/,
    );
  });

  it('permite cambiar de rol a un ADMIN si quedan otros ADMIN activos', async () => {
    const admin1 = await service.crear('Admin1', 'admin1', 'secreto123', Rol.ADMIN);
    await service.crear('Admin2', 'admin2', 'secreto123', Rol.ADMIN);

    const actualizado = await service.cambiarRol(admin1.id, Rol.OPERADOR);
    expect(actualizado.rol).toBe(Rol.OPERADOR);
  });

  it('NUNCA permite promocionar a nadie a OWNER', async () => {
    const admin = await service.crear('Admin1', 'admin1', 'secreto123', Rol.ADMIN);
    await expect(service.cambiarRol(admin.id, Rol.OWNER)).rejects.toThrow(
      /no se puede promocionar/i,
    );
  });

  it('NUNCA permite desactivar al OWNER', async () => {
    const owner = await repository.sembrarOwner('Brandon', 'brandon');
    await expect(service.desactivar(owner.id)).rejects.toThrow(/no se puede desactivar al owner/i);
  });

  it('NUNCA permite cambiar el rol del OWNER', async () => {
    const owner = await repository.sembrarOwner('Brandon', 'brandon');
    await expect(service.cambiarRol(owner.id, Rol.ADMIN)).rejects.toThrow(
      /no se puede cambiar el rol del owner/i,
    );
  });

  it('resetearPassword cambia el hash sin necesitar la contraseña anterior', async () => {
    const usuario = await service.crear('Pepe', 'pepe', 'secreto123', Rol.OPERADOR);
    const actualizado = await service.resetearPassword(usuario.id, 'nuevaClave123');
    expect(actualizado.passwordHash).toBe('hashed:nuevaClave123');
  });

  it('lanza NotFound si el usuario no existe', async () => {
    await expect(service.desactivar('no-existe')).rejects.toThrow(/no encontrado/i);
  });
});
