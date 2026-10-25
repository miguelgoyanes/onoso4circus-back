import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

const VENTANA_MS = 60_000;
const MAXIMO_POR_VENTANA = 120;

// Límite sencillo por IP en memoria (una sola instancia del backend); suficiente para
// los endpoints públicos de la boda. Detrás de un proxy hace falta `trust proxy` para que req.ip sea la real.
@Injectable()
export class BodaRateLimitGuard implements CanActivate {
  private readonly contadores = new Map<
    string,
    { cuenta: number; reinicio: number }
  >();

  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ahora = Date.now();
    const clave = request.ip ?? 'desconocida';

    if (this.contadores.size > 5000) {
      for (const [ip, contador] of this.contadores) {
        if (contador.reinicio <= ahora) this.contadores.delete(ip);
      }
    }

    const actual = this.contadores.get(clave);
    if (!actual || actual.reinicio <= ahora) {
      this.contadores.set(clave, { cuenta: 1, reinicio: ahora + VENTANA_MS });
      return true;
    }
    actual.cuenta += 1;
    if (actual.cuenta > MAXIMO_POR_VENTANA) {
      throw new HttpException(
        'Demasiadas peticiones',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
