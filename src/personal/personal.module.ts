import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmpleadoService } from './application/empleado.service';
import { EMPLEADO_REPOSITORY } from './application/empleado.repository';
import { TypeOrmEmpleadoRepository } from './infrastructure/typeorm-empleado.repository';
import { EmpleadoOrmEntity } from './infrastructure/orm/empleado.orm-entity';
import { EmpleadosController } from './api/empleados.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EmpleadoOrmEntity])],
  controllers: [EmpleadosController],
  providers: [EmpleadoService, { provide: EMPLEADO_REPOSITORY, useClass: TypeOrmEmpleadoRepository }],
  exports: [EmpleadoService],
})
export class PersonalModule {}
