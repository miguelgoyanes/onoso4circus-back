import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // "true" refleja el origen de la petición (equivale a permitir cualquiera) — necesario
  // porque /publico/plazas-web lo consume circusnova.es (otro dominio, sin login) además
  // del propio frontend admin. No hay riesgo de CSRF: la auth es por Bearer token en el
  // header Authorization, nunca por cookie, así que un origen ajeno no puede arrastrarlo.
  app.enableCors({ origin: true });
  // Detrás de nginx (un solo proxy) la IP del cliente viene en X-Forwarded-For: sin esto todos los invitados
  // parecerían la misma IP y compartirían el límite de peticiones de la boda.
  app.set('trust proxy', 1);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
