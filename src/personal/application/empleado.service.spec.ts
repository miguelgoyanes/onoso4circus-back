import Decimal from 'decimal.js';
import { Empleado } from '../domain/empleado';
import { RegimenEmpleado } from '../domain/regimen-empleado';
import { EmpleadoRepository } from './empleado.repository';
import { EmpleadoService } from './empleado.service';

class InMemoryEmpleadoRepository implements EmpleadoRepository {
  private readonly empleados = new Map<string, Empleado>();

  async save(empleado: Empleado): Promise<void> {
    this.empleados.set(empleado.id, empleado);
  }
  async findById(id: string): Promise<Empleado | null> {
    return this.empleados.get(id) ?? null;
  }
  async findAll(): Promise<Empleado[]> {
    return [...this.empleados.values()];
  }
}

describe('EmpleadoService', () => {
  let repo: InMemoryEmpleadoRepository;
  let service: EmpleadoService;

  beforeEach(() => {
    repo = new InMemoryEmpleadoRepository();
    service = new EmpleadoService(repo);
  });

  it('crea un empleado activo por defecto', async () => {
    const empleado = await service.crear('Juan', 'malabarista', RegimenEmpleado.CUENTA_AJENA);
    expect(empleado.activo).toBe(true);
    expect(empleado.regimen).toBe(RegimenEmpleado.CUENTA_AJENA);
  });

  it('crea un empleado sin importe de referencia si no se indica', async () => {
    const empleado = await service.crear('Juan', 'malabarista', RegimenEmpleado.CUENTA_AJENA);
    expect(empleado.importeReferenciaDia).toBeNull();
  });

  it('guarda el importe de referencia al día como caché simple', async () => {
    const empleado = await service.crear(
      'Juan',
      'malabarista',
      RegimenEmpleado.CUENTA_AJENA,
      new Decimal('80'),
    );
    expect(empleado.importeReferenciaDia?.toString()).toBe('80');
  });

  it('permite ajustar el importe de referencia al actualizar', async () => {
    const empleado = await service.crear('Juan', 'malabarista', RegimenEmpleado.CUENTA_AJENA);
    const actualizado = await service.actualizar(
      empleado.id,
      empleado.nombre,
      empleado.rol,
      empleado.regimen,
      new Decimal('95'),
    );
    expect(actualizado.importeReferenciaDia?.toString()).toBe('95');
  });

  it('lanza NotFound si el empleado no existe', async () => {
    await expect(service.obtener('no-existe')).rejects.toThrow(/no encontrado/i);
  });

  it('actualiza nombre, rol y regimen', async () => {
    const empleado = await service.crear('Juan', 'malabarista', RegimenEmpleado.CUENTA_AJENA);
    const actualizado = await service.actualizar(empleado.id, 'Juan Pérez', 'técnico', RegimenEmpleado.AUTONOMO);
    expect(actualizado.nombre).toBe('Juan Pérez');
    expect(actualizado.rol).toBe('técnico');
    expect(actualizado.regimen).toBe(RegimenEmpleado.AUTONOMO);
  });

  it('desactiva y reactiva un empleado', async () => {
    const empleado = await service.crear('Brandon', 'dueño', RegimenEmpleado.AUTONOMO);
    const desactivado = await service.desactivar(empleado.id);
    expect(desactivado.activo).toBe(false);

    const reactivado = await service.reactivar(empleado.id);
    expect(reactivado.activo).toBe(true);
  });

  it('lista todos los empleados creados', async () => {
    await service.crear('Juan', 'malabarista', RegimenEmpleado.CUENTA_AJENA);
    await service.crear('Ana', 'taquillera', RegimenEmpleado.CUENTA_AJENA);
    const todos = await service.listar();
    expect(todos).toHaveLength(2);
  });
});
