import { randomUUID } from 'crypto';
import { Fecha } from '../domain/fecha';
import { Plaza } from '../domain/plaza';
import { TipoActividad } from '../domain/tipo-actividad';
import { FechaRepository } from './fecha.repository';
import { PlazaRepository } from './plaza.repository';
import { FechaService } from './fecha.service';

class InMemoryFechaRepository implements FechaRepository {
  private readonly fechas = new Map<string, Fecha>();

  async save(fecha: Fecha): Promise<void> {
    this.fechas.set(fecha.id, fecha);
  }
  async findById(id: string): Promise<Fecha | null> {
    return this.fechas.get(id) ?? null;
  }
  async findByPlaza(plazaId: string): Promise<Fecha[]> {
    return [...this.fechas.values()].filter((f) => f.plazaId === plazaId);
  }
  async delete(id: string): Promise<void> {
    this.fechas.delete(id);
  }
}

class InMemoryPlazaRepository implements PlazaRepository {
  private readonly plazas = new Map<string, Plaza>();

  async save(plaza: Plaza): Promise<void> {
    this.plazas.set(plaza.id, plaza);
  }
  async findById(id: string): Promise<Plaza | null> {
    return this.plazas.get(id) ?? null;
  }
  async findAll(): Promise<Plaza[]> {
    return [...this.plazas.values()];
  }
  async delete(id: string): Promise<void> {
    this.plazas.delete(id);
  }
}

describe('FechaService', () => {
  let fechaRepo: InMemoryFechaRepository;
  let plazaRepo: InMemoryPlazaRepository;
  let service: FechaService;

  beforeEach(() => {
    fechaRepo = new InMemoryFechaRepository();
    plazaRepo = new InMemoryPlazaRepository();
    service = new FechaService(fechaRepo, plazaRepo);
  });

  it('crea una fecha cuando la plaza existe', async () => {
    const plaza = new Plaza(randomUUID(), 'Feria de Julio', 'Madrid');
    await plazaRepo.save(plaza);

    const fecha = await service.crear(plaza.id, new Date('2026-07-10'), TipoActividad.SHOW);
    expect(fecha.plazaId).toBe(plaza.id);
    expect(fecha.tipoActividad).toBe(TipoActividad.SHOW);
  });

  it('rechaza crear una fecha si la plaza no existe', async () => {
    await expect(
      service.crear('plaza-inexistente', new Date('2026-07-10'), TipoActividad.SHOW),
    ).rejects.toThrow(/la plaza indicada no existe/i);
  });

  it('lista solo las fechas de la plaza indicada', async () => {
    const plaza1 = new Plaza(randomUUID(), 'Plaza 1', 'Madrid');
    const plaza2 = new Plaza(randomUUID(), 'Plaza 2', 'Barcelona');
    await plazaRepo.save(plaza1);
    await plazaRepo.save(plaza2);

    await service.crear(plaza1.id, new Date('2026-07-10'), TipoActividad.SHOW);
    await service.crear(plaza2.id, new Date('2026-07-11'), TipoActividad.TALLER);

    const fechasPlaza1 = await service.listarPorPlaza(plaza1.id);
    expect(fechasPlaza1).toHaveLength(1);
    expect(fechasPlaza1[0].plazaId).toBe(plaza1.id);
  });

  it('lanza NotFound si la fecha no existe', async () => {
    await expect(service.obtener('no-existe')).rejects.toThrow(/no encontrada/i);
  });
});
