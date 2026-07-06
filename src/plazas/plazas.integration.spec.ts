import { NotFoundException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmTestModule } from '../test/typeorm-test.module';
import { PlazasModule } from './plazas.module';
import { PlazaService } from './application/plaza.service';
import { FechaService } from './application/fecha.service';
import { PaseService } from './application/pase.service';
import { TipoActividad } from './domain/tipo-actividad';

describe('Plazas/Fechas/Pases (integración contra Postgres real)', () => {
  let plazaService: PlazaService;
  let fechaService: FechaService;
  let paseService: PaseService;
  let moduleRef: import('@nestjs/testing').TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmTestModule, PlazasModule],
    }).compile();

    plazaService = moduleRef.get(PlazaService);
    fechaService = moduleRef.get(FechaService);
    paseService = moduleRef.get(PaseService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('crea una Plaza, una Fecha dentro de ella y un Pase dentro de esa fecha', async () => {
    const plaza = await plazaService.crear('Feria de Julio (test)', 'Madrid');
    expect(plaza.id).toBeDefined();

    const fecha = await fechaService.crear(plaza.id, new Date('2026-07-10'), TipoActividad.SHOW);
    expect(fecha.plazaId).toBe(plaza.id);

    const pase = await paseService.crear(fecha.id, '17:00', 'Pase de las 17:00');
    expect(pase.fechaId).toBe(fecha.id);

    const fechasDeLaPlaza = await fechaService.listarPorPlaza(plaza.id);
    expect(fechasDeLaPlaza.map((f) => f.id)).toContain(fecha.id);

    const pasesDeLaFecha = await paseService.listarPorFecha(fecha.id);
    expect(pasesDeLaFecha.map((p) => p.id)).toContain(pase.id);
  });

  it('rechaza crear una Fecha para una Plaza inexistente', async () => {
    await expect(
      fechaService.crear('00000000-0000-0000-0000-000000000000', new Date(), TipoActividad.SHOW),
    ).rejects.toThrow(NotFoundException);
  });

  it('actualiza y luego elimina una Plaza', async () => {
    const plaza = await plazaService.crear('Plaza temporal', 'Sevilla');
    const actualizada = await plazaService.actualizar(plaza.id, 'Plaza renombrada', 'Sevilla');
    expect(actualizada.nombre).toBe('Plaza renombrada');

    await plazaService.eliminar(plaza.id);
    await expect(plazaService.obtener(plaza.id)).rejects.toThrow(NotFoundException);
  });
});
