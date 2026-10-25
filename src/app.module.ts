import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountingModule } from './accounting/accounting.module';
import { AuthModule } from './auth/auth.module';
import { PlazasModule } from './plazas/plazas.module';
import { TesoreriaModule } from './tesoreria/tesoreria.module';
import { GastosModule } from './gastos/gastos.module';
import { PersonalModule } from './personal/personal.module';
import { StockModule } from './stock/stock.module';
import { VentasModule } from './ventas/ventas.module';
import { ActivosModule } from './activos/activos.module';
import { AnalisisModule } from './analisis/analisis.module';
import { ContabilidadModule } from './contabilidad/contabilidad.module';
import { PlazasWebModule } from './plazas-web/plazas-web.module';
import { BodaModule } from './boda/boda.module';

@Module({
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
        // Crea y ajusta las tablas solas: cómodo en desarrollo, arriesgado con datos reales. En producción, una vez
        // creadas las tablas, poner DB_SYNC=false en el .env del servidor.
        synchronize: config.get<string>('DB_SYNC') !== 'false',
      }),
    }),
    AccountingModule,
    AuthModule,
    PlazasModule,
    TesoreriaModule,
    GastosModule,
    PersonalModule,
    StockModule,
    VentasModule,
    ActivosModule,
    AnalisisModule,
    ContabilidadModule,
    PlazasWebModule,
    BodaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
