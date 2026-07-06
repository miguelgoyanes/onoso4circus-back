import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { USUARIO_REPOSITORY } from '../application/usuario.repository';
import type { UsuarioRepository } from '../application/usuario.repository';
import type { JwtPayload } from '../application/auth.service';
import { AuthenticatedUser } from './authenticated-user';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @Inject(USUARIO_REPOSITORY) private readonly usuarioRepository: UsuarioRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Se ejecuta en CADA petición autenticada: el token puede seguir siendo válido
  // aunque el usuario haya sido desactivado después de emitirlo, así que se
  // vuelve a comprobar `activo` contra la base de datos en vez de confiar solo
  // en lo que dice el payload del JWT.
  public async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const usuario = await this.usuarioRepository.findById(payload.sub);
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Usuario desactivado o inexistente');
    }
    return { userId: usuario.id, email: usuario.email, rol: usuario.rol };
  }
}
