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

  async findByEmail(email: string): Promise<Usuario | null> {
    return [...this.usuarios.values()].find((u) => u.email === email) ?? null;
  }

  async countActiveAdmins(): Promise<number> {
    return [...this.usuarios.values()].filter((u) => u.rol === Rol.ADMIN && u.activo).length;
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

  it('crea un usuario con la contraseña hasheada, nunca en texto plano', async () => {
    const usuario = await service.crear('Juan', 'juan@test.com', 'secreto123', Rol.OPERADOR);
    expect(usuario.passwordHash).toBe('hashed:secreto123');
    expect(usuario.activo).toBe(true);
  });

  it('rechaza crear un usuario con un email ya existente', async () => {
    await service.crear('Juan', 'juan@test.com', 'secreto123', Rol.OPERADOR);
    await expect(
      service.crear('Otro Juan', 'juan@test.com', 'otraclave123', Rol.OPERADOR),
    ).rejects.toThrow(/ya existe/i);
  });

  it('permite desactivar a un OPERADOR sin restricciones', async () => {
    const operador = await service.crear('Pepe', 'pepe@test.com', 'secreto123', Rol.OPERADOR);
    const desactivado = await service.desactivar(operador.id);
    expect(desactivado.activo).toBe(false);
  });

  it('permite desactivar a un ADMIN si quedan otros ADMIN activos', async () => {
    const admin1 = await service.crear('Admin1', 'a1@test.com', 'secreto123', Rol.ADMIN);
    await service.crear('Admin2', 'a2@test.com', 'secreto123', Rol.ADMIN);

    const desactivado = await service.desactivar(admin1.id);
    expect(desactivado.activo).toBe(false);
  });

  it('NUNCA permite desactivar al último ADMIN activo', async () => {
    const unicoAdmin = await service.crear('Unico', 'unico@test.com', 'secreto123', Rol.ADMIN);
    await expect(service.desactivar(unicoAdmin.id)).rejects.toThrow(/último ADMIN activo/);

    const sigueActivo = await repository.findById(unicoAdmin.id);
    expect(sigueActivo?.activo).toBe(true);
  });

  it('NUNCA permite degradar a OPERADOR al último ADMIN activo', async () => {
    const unicoAdmin = await service.crear('Unico', 'unico@test.com', 'secreto123', Rol.ADMIN);
    await expect(service.cambiarRol(unicoAdmin.id, Rol.OPERADOR)).rejects.toThrow(
      /último ADMIN activo/,
    );
  });

  it('permite cambiar de rol a un ADMIN si quedan otros ADMIN activos', async () => {
    const admin1 = await service.crear('Admin1', 'a1@test.com', 'secreto123', Rol.ADMIN);
    await service.crear('Admin2', 'a2@test.com', 'secreto123', Rol.ADMIN);

    const actualizado = await service.cambiarRol(admin1.id, Rol.OPERADOR);
    expect(actualizado.rol).toBe(Rol.OPERADOR);
  });

  it('lanza NotFound si el usuario no existe', async () => {
    await expect(service.desactivar('no-existe')).rejects.toThrow(/no encontrado/i);
  });
});
