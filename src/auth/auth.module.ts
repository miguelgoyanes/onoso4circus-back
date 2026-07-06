import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './application/auth.service';
import { UsuarioService } from './application/usuario.service';
import { USUARIO_REPOSITORY } from './application/usuario.repository';
import { PASSWORD_HASHER } from './application/password-hasher';
import { TypeOrmUsuarioRepository } from './infrastructure/typeorm-usuario.repository';
import { BcryptPasswordHasher } from './infrastructure/bcrypt-password-hasher';
import { UsuarioOrmEntity } from './infrastructure/orm/usuario.orm-entity';
import { AuthController } from './api/auth.controller';
import { UsuariosController } from './api/usuarios.controller';
import { JwtStrategy } from './api/jwt.strategy';
import { RolesGuard } from './api/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsuarioOrmEntity]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '8h') as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
  ],
  controllers: [AuthController, UsuariosController],
  providers: [
    AuthService,
    UsuarioService,
    JwtStrategy,
    RolesGuard,
    { provide: USUARIO_REPOSITORY, useClass: TypeOrmUsuarioRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
  ],
  exports: [UsuarioService, AuthService],
})
export class AuthModule {}
