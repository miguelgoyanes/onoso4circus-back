import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Los tests de integración usan `${DB_NAME}_test` en vez de DB_NAME para no
// escribir datos de prueba en la base de datos de desarrollo.
export const TypeOrmTestModule = TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get<string>('DB_HOST'),
    port: parseInt(config.get<string>('DB_PORT', '5432'), 10),
    username: config.get<string>('DB_USER'),
    password: config.get<string>('DB_PASSWORD'),
    database: `${config.getOrThrow<string>('DB_NAME')}_test`,
    autoLoadEntities: true,
    synchronize: true,
  }),
});
