import { Injectable } from '@nestjs/common';
import { VentaBar } from '../domain/venta-bar';
import { VentaBarFilter, VentaBarRepository } from '../application/venta-bar.repository';

@Injectable()
export class InMemoryVentaBarRepository implements VentaBarRepository {
  private readonly ventas = new Map<string, VentaBar>();

  public async save(venta: VentaBar): Promise<void> {
    this.ventas.set(venta.id, venta);
  }

  public async findById(id: string): Promise<VentaBar | null> {
    return this.ventas.get(id) ?? null;
  }

  public async findAll(filter?: VentaBarFilter): Promise<VentaBar[]> {
    return [...this.ventas.values()]
      .filter((v) => {
        if (filter?.paseId && v.paseId !== filter.paseId) return false;
        if (filter?.fechaId && v.fechaId !== filter.fechaId) return false;
        if (filter?.plazaId && v.plazaId !== filter.plazaId) return false;
        if (filter?.desde && v.creadoEn.getTime() < filter.desde.getTime()) return false;
        if (filter?.hasta && v.creadoEn.getTime() >= filter.hasta.getTime()) return false;
        return true;
      })
      .sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime());
  }

  public async delete(id: string): Promise<void> {
    this.ventas.delete(id);
  }

  // Aproximación por `creadoEn` — este doble en memoria no modela la tabla `fechas`, así que
  // no puede replicar el join por fecha real del evento que usa la implementación TypeORM.
  // Sirve para los tests actuales (ninguno ejercita esta ventana con datos donde la fecha de
  // alta difiera de la fecha del evento).
  public async contarEnRango(desde: Date, hasta: Date): Promise<number> {
    return [...this.ventas.values()].filter(
      (v) => v.creadoEn.getTime() >= desde.getTime() && v.creadoEn.getTime() < hasta.getTime(),
    ).length;
  }

  // Aproximación por `creadoEn` — ver comentario de contarEnRango.
  public async listarEnRangoReal(desde: Date, hasta: Date): Promise<VentaBar[]> {
    return [...this.ventas.values()].filter(
      (v) => v.creadoEn.getTime() >= desde.getTime() && v.creadoEn.getTime() < hasta.getTime(),
    );
  }
}
