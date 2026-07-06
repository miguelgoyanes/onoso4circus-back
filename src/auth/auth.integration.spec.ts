import { randomUUID } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
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
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            type: 'postgres',
            host: config.get<string>('DB_HOST'),
            port: parseInt(config.get<string>('DB_PORT', '5432'), 10),
            username: config.get<string>('DB_USER'),
            password: config.get<string>('DB_PASSWORD'),
            database: config.get<string>('DB_NAME'),
            autoLoadEntities: true,
            synchronize: true,
          }),
        }),
        AuthModule,
      ],
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
    const email = `login-ok-${randomUUID()}@test.com`;
    await usuarioService.crear('Operador Test', email, 'password1234', Rol.OPERADOR);

    const { accessToken } = await authService.login(email, 'password1234');
    expect(typeof accessToken).toBe('string');

    const payload = jwtService.verify(accessToken);
    expect(payload.email).toBe(email);
    expect(payload.rol).toBe(Rol.OPERADOR);
  });

  it('rechaza login con contraseña incorrecta', async () => {
    const email = `login-bad-${randomUUID()}@test.com`;
    await usuarioService.crear('Operador Test', email, 'password1234', Rol.OPERADOR);

    await expect(authService.login(email, 'password-incorrecta')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza login de un usuario desactivado', async () => {
    const email = `login-desactivado-${randomUUID()}@test.com`;
    const usuario = await usuarioService.crear('Otro Admin', email, 'password1234', Rol.ADMIN);
    // se necesita un segundo ADMIN activo para poder desactivar este sin violar la salvaguarda
    await usuarioService.crear('Admin de respaldo', `respaldo-${randomUUID()}@test.com`, 'password1234', Rol.ADMIN);
    await usuarioService.desactivar(usuario.id);

    await expect(authService.login(email, 'password1234')).rejects.toThrow(UnauthorizedException);
  });

  it('el JwtAuthGuard corta el acceso en la siguiente petición tras desactivar al usuario, sin esperar a que expire el token', async () => {
    const email = `guard-${randomUUID()}@test.com`;
    const usuario = await usuarioService.crear('Operador a desactivar', email, 'password1234', Rol.OPERADOR);

    const { accessToken } = await authService.login(email, 'password1234');
    const payload = jwtService.verify(accessToken);

    // Con el token recién emitido, el guard debe aceptar la petición
    await expect(jwtStrategy.validate(payload)).resolves.toMatchObject({ email, rol: Rol.OPERADOR });

    // Se desactiva al usuario (el token sigue siendo válido y no ha expirado)
    await usuarioService.desactivar(usuario.id);

    // La siguiente petición con el MISMO token ya debe rechazarse
    await expect(jwtStrategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });
});
