import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import Decimal from 'decimal.js';
import { TypeOrmTestModule } from '../test/typeorm-test.module';
import { PersonalModule } from './personal.module';
import { EmpleadoService } from './application/empleado.service';
import { RegimenEmpleado } from './domain/regimen-empleado';

describe('Personal: Empleado (integración contra Postgres real)', () => {
  let empleadoService: EmpleadoService;
  let moduleRef: import('@nestjs/testing').TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmTestModule, PersonalModule],
    }).compile();

    empleadoService = moduleRef.get(EmpleadoService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('crea un Empleado activo por defecto, con su regimen', async () => {
    const empleado = await empleadoService.crear('Juan (test)', 'malabarista', RegimenEmpleado.CUENTA_AJENA);
    expect(empleado.activo).toBe(true);
    expect(empleado.regimen).toBe(RegimenEmpleado.CUENTA_AJENA);

    const releido = await empleadoService.obtener(empleado.id);
    expect(releido.nombre).toBe('Juan (test)');
  });

  it('persiste el importe de referencia al día como caché simple, y se puede reajustar', async () => {
    const empleado = await empleadoService.crear(
      'Ana (test)',
      'taquillera',
      RegimenEmpleado.CUENTA_AJENA,
      new Decimal('60.50'),
    );
    const releido = await empleadoService.obtener(empleado.id);
    expect(releido.importeReferenciaDia?.toString()).toBe('60.5');

    const ajustado = await empleadoService.actualizar(
      empleado.id,
      empleado.nombre,
      empleado.rol,
      empleado.regimen,
      new Decimal('75'),
    );
    expect(ajustado.importeReferenciaDia?.toString()).toBe('75');
  });

  it('desactiva y reactiva un Empleado, persistiendo el estado', async () => {
    const empleado = await empleadoService.crear('Brandon (test)', 'dueño', RegimenEmpleado.AUTONOMO);
    await empleadoService.desactivar(empleado.id);
    expect((await empleadoService.obtener(empleado.id)).activo).toBe(false);

    await empleadoService.reactivar(empleado.id);
    expect((await empleadoService.obtener(empleado.id)).activo).toBe(true);
  });
});
