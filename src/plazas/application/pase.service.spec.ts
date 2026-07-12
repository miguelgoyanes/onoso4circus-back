import { randomUUID } from 'crypto';
import { Fecha } from '../domain/fecha';
import { Pase } from '../domain/pase';
import { TipoActividad } from '../domain/tipo-actividad';
import { FechaRepository } from './fecha.repository';
import { PaseRepository } from './pase.repository';
import { PaseService } from './pase.service';

class InMemoryPaseRepository implements PaseRepository {
  private readonly pases = new Map<string, Pase>();

  async save(pase: Pase): Promise<void> {
    this.pases.set(pase.id, pase);
  }
  async findById(id: string): Promise<Pase | null> {
    return this.pases.get(id) ?? null;
  }
  async findByFecha(fechaId: string): Promise<Pase[]> {
    return [...this.pases.values()].filter((p) => p.fechaId === fechaId);
  }
  async delete(id: string): Promise<void> {
    this.pases.delete(id);
  }
  async contarTodos(): Promise<number> {
    return this.pases.size;
  }
}

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

describe('PaseService', () => {
  let paseRepo: InMemoryPaseRepository;
  let fechaRepo: InMemoryFechaRepository;
  let service: PaseService;

  beforeEach(() => {
    paseRepo = new InMemoryPaseRepository();
    fechaRepo = new InMemoryFechaRepository();
    service = new PaseService(paseRepo, fechaRepo);
  });

  it('crea un pase cuando la fecha existe', async () => {
    const fecha = new Fecha(randomUUID(), randomUUID(), new Date('2026-07-10'), TipoActividad.SHOW);
    await fechaRepo.save(fecha);

    const pase = await service.crear(fecha.id, '17:00', 'Pase de tarde');
    expect(pase.fechaId).toBe(fecha.id);
    expect(pase.hora).toBe('17:00');
    expect(pase.nombre).toBe('Pase de tarde');
  });

  it('rechaza crear un pase si la fecha no existe', async () => {
    await expect(service.crear('fecha-inexistente', '17:00')).rejects.toThrow(
      /la fecha indicada no existe/i,
    );
  });

  it('lista solo los pases de la fecha indicada', async () => {
    const fecha1 = new Fecha(randomUUID(), randomUUID(), new Date('2026-07-10'), TipoActividad.SHOW);
    const fecha2 = new Fecha(randomUUID(), randomUUID(), new Date('2026-07-11'), TipoActividad.SHOW);
    await fechaRepo.save(fecha1);
    await fechaRepo.save(fecha2);

    await service.crear(fecha1.id, '17:00');
    await service.crear(fecha2.id, '20:00');

    const pasesFecha1 = await service.listarPorFecha(fecha1.id);
    expect(pasesFecha1).toHaveLength(1);
    expect(pasesFecha1[0].fechaId).toBe(fecha1.id);
  });

  it('lanza NotFound si el pase no existe', async () => {
    await expect(service.obtener('no-existe')).rejects.toThrow(/no encontrado/i);
  });
});
