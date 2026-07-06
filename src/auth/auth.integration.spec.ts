import { randomUUID } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { TypeOrmTestModule } from '../test/typeorm-test.module';
import { AuthModule } from './auth.module';
import { AuthService } from './application/auth.service';
import { UsuarioService } from './application/usuario.service';
import { Rol } from './domain/usuario';
import { JwtStrategy } from './api/jwt.strategy';

describe('Auth (integración contra Postgres real)', () => {
  let authService: AuthService;
  let usuarioService: UsuarioService;
  let jwtService: JwtService;
  let jwtStrategy: JwtStrategy;
  let moduleRef: import('@nestjs/testing').TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmTestModule, AuthModule],
    }).compile();

    authService = moduleRef.get(AuthService);
    usuarioService = moduleRef.get(UsuarioService);
    jwtService = moduleRef.get(JwtService);
    jwtStrategy = moduleRef.get(JwtStrategy);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('permite login con credenciales correctas y emite un JWT válido', async () => {
    const username = `login-ok-${randomUUID()}`;
    await usuarioService.crear('Operador Test', username, 'password1234', Rol.OPERADOR);

    const { accessToken } = await authService.login(username, 'password1234');
    expect(typeof accessToken).toBe('string');

    const payload = jwtService.verify(accessToken);
    expect(payload.username).toBe(username);
    expect(payload.rol).toBe(Rol.OPERADOR);
  });

  it('rechaza login con contraseña incorrecta', async () => {
    const username = `login-bad-${randomUUID()}`;
    await usuarioService.crear('Operador Test', username, 'password1234', Rol.OPERADOR);

    await expect(authService.login(username, 'password-incorrecta')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza login de un usuario desactivado', async () => {
    const username = `login-desactivado-${randomUUID()}`;
    const usuario = await usuarioService.crear('Otro Admin', username, 'password1234', Rol.ADMIN);
    // se necesita un segundo ADMIN activo para poder desactivar este sin violar la salvaguarda
    await usuarioService.crear(
      'Admin de respaldo',
      `respaldo-${randomUUID()}`,
      'password1234',
      Rol.ADMIN,
    );
    await usuarioService.desactivar(usuario.id);

    await expect(authService.login(username, 'password1234')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('el JwtAuthGuard corta el acceso en la siguiente petición tras desactivar al usuario, sin esperar a que expire el token', async () => {
    const username = `guard-${randomUUID()}`;
    const usuario = await usuarioService.crear(
      'Operador a desactivar',
      username,
      'password1234',
      Rol.OPERADOR,
    );

    const { accessToken } = await authService.login(username, 'password1234');
    const payload = jwtService.verify(accessToken);

    // Con el token recién emitido, el guard debe aceptar la petición
    await expect(jwtStrategy.validate(payload)).resolves.toMatchObject({
      username,
      rol: Rol.OPERADOR,
    });

    // Se desactiva al usuario (el token sigue siendo válido y no ha expirado)
    await usuarioService.desactivar(usuario.id);

    // La siguiente petición con el MISMO token ya debe rechazarse
    await expect(jwtStrategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });
});
