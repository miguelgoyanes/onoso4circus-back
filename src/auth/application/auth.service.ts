import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PASSWORD_HASHER } from './password-hasher';
import type { PasswordHasher } from './password-hasher';
import { USUARIO_REPOSITORY } from './usuario.repository';
import type { UsuarioRepository } from './usuario.repository';

export interface JwtPayload {
  sub: string;
  username: string;
  rol: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly repository: UsuarioRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    private readonly jwtService: JwtService,
  ) {}

  public async login(username: string, password: string): Promise<{ accessToken: string }> {
    const usuario = await this.repository.findByUsername(username);
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValida = await this.hasher.compare(password, usuario.passwordHash);
    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: JwtPayload = { sub: usuario.id, username: usuario.username, rol: usuario.rol };
    return { accessToken: await this.jwtService.signAsync(payload) };
  }
}
