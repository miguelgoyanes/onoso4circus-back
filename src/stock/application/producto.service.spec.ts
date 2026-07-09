import Decimal from 'decimal.js';
import { Producto } from '../domain/producto';
import { ProductoRepository } from './producto.repository';
import { RecepcionStock } from '../domain/recepcion-stock';
import { RecepcionStockRepository } from './recepcion-stock.repository';
import { AjusteStock } from '../domain/ajuste-stock';
import { TipoAjusteStock } from '../domain/tipo-ajuste-stock';
import { AjusteStockRepository } from './ajuste-stock.repository';
import { ProductoService } from './producto.service';

class InMemoryProductoRepository implements ProductoRepository {
  private readonly productos = new Map<string, Producto>();
  async save(producto: Producto): Promise<void> {
    this.productos.set(producto.id, producto);
  }
  async findById(id: string): Promise<Producto | null> {
    return this.productos.get(id) ?? null;
  }
  async findAll(): Promise<Producto[]> {
    return [...this.productos.values()];
  }
  async delete(id: string): Promise<void> {
    this.productos.delete(id);
  }
}

class InMemoryRecepcionStockRepository implements RecepcionStockRepository {
  private readonly recepciones = new Map<string, RecepcionStock>();
  async save(recepcion: RecepcionStock): Promise<void> {
    this.recepciones.set(recepcion.id, recepcion);
  }
  async findById(id: string): Promise<RecepcionStock | null> {
    return this.recepciones.get(id) ?? null;
  }
  async findAll(): Promise<RecepcionStock[]> {
    return [...this.recepciones.values()];
  }
  async existeConProducto(productoId: string): Promise<boolean> {
    return [...this.recepciones.values()].some((r) => r.productoId === productoId);
  }
  async delete(id: string): Promise<void> {
    this.recepciones.delete(id);
  }
}

class InMemoryAjusteStockRepository implements AjusteStockRepository {
  private readonly ajustes = new Map<string, AjusteStock>();
  async save(ajuste: AjusteStock): Promise<void> {
    this.ajustes.set(ajuste.id, ajuste);
  }
  async findById(id: string): Promise<AjusteStock | null> {
    return this.ajustes.get(id) ?? null;
  }
  async findAll(): Promise<AjusteStock[]> {
    return [...this.ajustes.values()];
  }
  async existeConProducto(productoId: string): Promise<boolean> {
    return [...this.ajustes.values()].some((a) => a.productoId === productoId);
  }
  async delete(id: string): Promise<void> {
    this.ajustes.delete(id);
  }
}

describe('ProductoService', () => {
  let productoRepo: InMemoryProductoRepository;
  let recepcionRepo: InMemoryRecepcionStockRepository;
  let ajusteRepo: InMemoryAjusteStockRepository;
  let service: ProductoService;

  beforeEach(() => {
    productoRepo = new InMemoryProductoRepository();
    recepcionRepo = new InMemoryRecepcionStockRepository();
    ajusteRepo = new InMemoryAjusteStockRepository();
    service = new ProductoService(productoRepo, recepcionRepo, ajusteRepo);
  });

  it('crea un producto con cantidad y coste en cero', async () => {
    const producto = await service.crear('Coca-Cola', new Decimal(2), true);
    expect(producto.cantidadActual).toBe(0);
    expect(producto.costeUnitarioActual.equals(new Decimal(0))).toBe(true);
    expect(producto.activo).toBe(true);
  });

  it('actualiza nombre, precio y aplicaIva sin tocar cantidad ni coste', async () => {
    const producto = await service.crear('Coca-Cola', new Decimal(2), true);
    await recepcionRepo.save(
      new RecepcionStock({
        id: 'r1',
        productoId: producto.id,
        cantidad: 10,
        costeUnitario: new Decimal(0.5),
        baseImponible: new Decimal(5),
        importeTotal: new Decimal(5),
        fecha: new Date(),
        cuentaOrigenId: 'cuenta-1',
        journalEntryId: 'je-1',
      }),
    );
    await service.recalcularDesdeHistorial(producto.id);

    const actualizado = await service.actualizar(producto.id, 'Coca-Cola Zero', new Decimal(2.5), false);
    expect(actualizado.nombre).toBe('Coca-Cola Zero');
    expect(actualizado.precioVentaPublico.equals(new Decimal(2.5))).toBe(true);
    expect(actualizado.aplicaIva).toBe(false);
    expect(actualizado.cantidadActual).toBe(10);
  });

  it('desactiva y reactiva un producto', async () => {
    const producto = await service.crear('Fanta', new Decimal(2), true);
    const desactivado = await service.desactivar(producto.id);
    expect(desactivado.activo).toBe(false);
    const reactivado = await service.activar(producto.id);
    expect(reactivado.activo).toBe(true);
  });

  it('permite eliminar un producto sin movimientos de stock', async () => {
    const producto = await service.crear('Agua', new Decimal(1), false);
    await service.eliminar(producto.id);
    await expect(service.obtener(producto.id)).rejects.toThrow(/no encontrado/i);
  });

  it('rechaza eliminar un producto con recepciones registradas', async () => {
    const producto = await service.crear('Agua', new Decimal(1), false);
    await recepcionRepo.save(
      new RecepcionStock({
        id: 'r1',
        productoId: producto.id,
        cantidad: 10,
        costeUnitario: new Decimal(0.3),
        baseImponible: new Decimal(3),
        importeTotal: new Decimal(3),
        fecha: new Date(),
        cuentaOrigenId: 'cuenta-1',
        journalEntryId: 'je-1',
      }),
    );
    await expect(service.eliminar(producto.id)).rejects.toThrow(/movimientos de stock/i);
  });

  it('rechaza eliminar un producto con ajustes registrados', async () => {
    const producto = await service.crear('Agua', new Decimal(1), false);
    await ajusteRepo.save(
      new AjusteStock('a1', producto.id, TipoAjusteStock.MERMA, 2, new Decimal(0.3), 'je-1', new Date()),
    );
    await expect(service.eliminar(producto.id)).rejects.toThrow(/movimientos de stock/i);
  });

  describe('recalcularDesdeHistorial (coste medio ponderado)', () => {
    // `fecha` es el único campo de fecha — completo (día y hora), siempre editable por el
    // usuario, y es lo que determina el orden real del historial.
    async function guardarRecepcion(productoId: string, cantidad: number, costeUnitario: number, fecha: Date) {
      await recepcionRepo.save(
        new RecepcionStock({
          id: `r-${Math.random()}`,
          productoId,
          cantidad,
          costeUnitario: new Decimal(costeUnitario),
          baseImponible: new Decimal(costeUnitario).times(cantidad),
          importeTotal: new Decimal(costeUnitario).times(cantidad),
          fecha,
          cuentaOrigenId: 'cuenta-1',
          journalEntryId: `je-${Math.random()}`,
        }),
      );
    }

    async function guardarAjuste(productoId: string, cantidad: number, costeAplicado: number, fecha: Date) {
      await ajusteRepo.save(
        new AjusteStock(
          `a-${Math.random()}`,
          productoId,
          TipoAjusteStock.MERMA,
          cantidad,
          new Decimal(costeAplicado),
          `je-${Math.random()}`,
          fecha,
        ),
      );
    }

    it('una sola recepción: el coste medio es el coste de esa recepción', async () => {
      const producto = await service.crear('Coca-Cola', new Decimal(2), true);
      await guardarRecepcion(producto.id, 190, 1, new Date('2026-07-01'));

      const actualizado = await service.recalcularDesdeHistorial(producto.id);
      expect(actualizado.cantidadActual).toBe(190);
      expect(actualizado.costeUnitarioActual.equals(new Decimal(1))).toBe(true);
    });

    it('una salida no cambia el coste medio, solo resta cantidad', async () => {
      const producto = await service.crear('Coca-Cola', new Decimal(2), true);
      await guardarRecepcion(producto.id, 190, 1, new Date('2026-07-01'));
      await guardarAjuste(producto.id, 5, 1, new Date('2026-07-02'));

      const actualizado = await service.recalcularDesdeHistorial(producto.id);
      expect(actualizado.cantidadActual).toBe(185);
      expect(actualizado.costeUnitarioActual.equals(new Decimal(1))).toBe(true);
    });

    it('dos recepciones a distinto coste: recalcula la media ponderada por cantidad', async () => {
      const producto = await service.crear('Coca-Cola', new Decimal(2), true);
      await guardarRecepcion(producto.id, 190, 1, new Date('2026-07-01'));
      await guardarAjuste(producto.id, 5, 1, new Date('2026-07-02'));
      await guardarRecepcion(producto.id, 12, 2, new Date('2026-07-03'));

      const actualizado = await service.recalcularDesdeHistorial(producto.id);
      // (185×1 + 12×2) / 197 = 209/197 = 1.0609... → 1.06
      expect(actualizado.cantidadActual).toBe(197);
      expect(actualizado.costeUnitarioActual.equals(new Decimal('1.06'))).toBe(true);
    });

    it('el orden real (fecha) manda, no el orden de creación de los registros en el repositorio', async () => {
      const producto = await service.crear('Coca-Cola', new Decimal(2), true);
      // Se guardan "al revés" para comprobar que el replay ordena por fecha, no por el
      // orden en que se insertaron en el repositorio en memoria.
      await guardarRecepcion(producto.id, 12, 2, new Date('2026-07-03'));
      await guardarAjuste(producto.id, 5, 1, new Date('2026-07-02'));
      await guardarRecepcion(producto.id, 190, 1, new Date('2026-07-01'));

      const actualizado = await service.recalcularDesdeHistorial(producto.id);
      expect(actualizado.cantidadActual).toBe(197);
      expect(actualizado.costeUnitarioActual.equals(new Decimal('1.06'))).toBe(true);
    });

    it('caso reportado: recepción + salida + recepción el MISMO día, en horas distintas, ordenan por la hora real de cada una', async () => {
      const producto = await service.crear('Coca-Cola', new Decimal(2), true);
      const t1 = new Date('2026-07-08T09:00:00Z');
      const t2 = new Date('2026-07-08T12:00:00Z');
      const t3 = new Date('2026-07-08T18:00:00Z');

      // Las tres comparten el mismo día pero cada una lleva su propia hora — el usuario
      // puede fijarla a mano para reubicar un movimiento exactamente donde ocurrió.
      await guardarRecepcion(producto.id, 100, 1, t1); // entrada 100 @1 → saldo 100
      await guardarAjuste(producto.id, 10, 1, t2); // salida 10 → saldo 90
      await guardarRecepcion(producto.id, 10, 3, t3); // entrada 10 @3 → saldo 100

      const actualizado = await service.recalcularDesdeHistorial(producto.id);
      expect(actualizado.cantidadActual).toBe(100);
      // (90×1 + 10×3) / 100 = 120/100 = 1.2 — si se hubiera ordenado mal (ambas entradas
      // antes que la salida), la media habría salido distinta.
      expect(actualizado.costeUnitarioActual.equals(new Decimal('1.2'))).toBe(true);
    });

    it('permite dejar el stock en negativo, nunca bloquea', async () => {
      const producto = await service.crear('Coca-Cola', new Decimal(2), true);
      await guardarRecepcion(producto.id, 3, 0.5, new Date('2026-07-01'));
      await guardarAjuste(producto.id, 8, 0.5, new Date('2026-07-02'));

      const actualizado = await service.recalcularDesdeHistorial(producto.id);
      expect(actualizado.cantidadActual).toBe(-5);
    });
  });
});
