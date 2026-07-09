import Decimal from 'decimal.js';
import { DireccionOrden } from '../domain/direccion-orden';
import { OrigenVenta } from '../domain/origen-venta';
import { VentaEntradas } from '../domain/venta-entradas';
import { InMemoryTipoEntradaRepository } from '../infrastructure/in-memory-tipo-entrada.repository';
import { InMemoryVentaEntradasRepository } from '../infrastructure/in-memory-venta-entradas.repository';
import { TipoEntradaService } from './tipo-entrada.service';

describe('TipoEntradaService', () => {
  let ventaEntradasRepository: InMemoryVentaEntradasRepository;
  let service: TipoEntradaService;

  beforeEach(() => {
    ventaEntradasRepository = new InMemoryVentaEntradasRepository();
    service = new TipoEntradaService(new InMemoryTipoEntradaRepository(), ventaEntradasRepository);
  });

  it('crea tipos de entrada añadiéndolos al final del orden manual', async () => {
    const general = await service.crear('General', new Decimal(10), false);
    const vip = await service.crear('VIP', new Decimal(20), true, '#ff0000');

    expect(general.orden).toBe(0);
    expect(vip.orden).toBe(1);
    expect(vip.color).toBe('#ff0000');
  });

  it('mover intercambia el orden con el vecino', async () => {
    const general = await service.crear('General', new Decimal(10), false);
    const vip = await service.crear('VIP', new Decimal(20), true);

    const [primero, segundo] = await service.mover(vip.id, DireccionOrden.ARRIBA);

    expect(primero.id).toBe(vip.id);
    expect(segundo.id).toBe(general.id);
  });

  it('no elimina un tipo de entrada usado en alguna venta; sí se puede desactivar', async () => {
    const general = await service.crear('General', new Decimal(10), false);
    await ventaEntradasRepository.save(
      new VentaEntradas({
        id: 'v1',
        paseId: 'pase1',
        fechaId: 'fecha1',
        plazaId: 'plaza1',
        tipoEntradaId: general.id,
        cantidad: 1,
        precioUnitarioAplicado: new Decimal(10),
        cuentaCobroId: 'cuenta1',
        origen: OrigenVenta.FISICA,
        journalEntryId: 'je1',
        creadoEn: new Date(),
      }),
    );

    await expect(service.eliminar(general.id)).rejects.toThrow(/no se puede eliminar/i);

    const desactivado = await service.desactivar(general.id);
    expect(desactivado.activo).toBe(false);
  });

  it('elimina un tipo de entrada sin ventas asociadas', async () => {
    const general = await service.crear('General', new Decimal(10), false);
    await service.eliminar(general.id);
    await expect(service.obtener(general.id)).rejects.toThrow(/no encontrado/i);
  });
});
