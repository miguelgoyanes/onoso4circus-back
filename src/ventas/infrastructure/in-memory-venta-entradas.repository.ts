import { Injectable } from '@nestjs/common';
import { VentaEntradas } from '../domain/venta-entradas';
import { VentaEntradasFilter, VentaEntradasRepository } from '../application/venta-entradas.repository';

@Injectable()
export class InMemoryVentaEntradasRepository implements VentaEntradasRepository {
  private readonly ventas = new Map<string, VentaEntradas>();

  public async save(venta: VentaEntradas): Promise<void> {
    this.ventas.set(venta.id, venta);
  }

  public async findById(id: string): Promise<VentaEntradas | null> {
    return this.ventas.get(id) ?? null;
  }

  public async findAll(filter?: VentaEntradasFilter): Promise<VentaEntradas[]> {
    return [...this.ventas.values()]
      .filter((v) => {
        if (filter?.paseId && v.paseId !== filter.paseId) return false;
        if (filter?.fechaId && v.fechaId !== filter.fechaId) return false;
        if (filter?.plazaId && v.plazaId !== filter.plazaId) return false;
        return true;
      })
      .sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime());
  }

  public async existeConTipoEntrada(tipoEntradaId: string): Promise<boolean> {
    return [...this.ventas.values()].some((v) => v.tipoEntradaId === tipoEntradaId);
  }

  public async delete(id: string): Promise<void> {
    this.ventas.delete(id);
  }

  // Aproximación por `creadoEn` — ver comentario equivalente en InMemoryVentaBarRepository.
  public async contarEnRango(desde: Date, hasta: Date): Promise<number> {
    return [...this.ventas.values()].filter(
      (v) => v.creadoEn.getTime() >= desde.getTime() && v.creadoEn.getTime() < hasta.getTime(),
    ).length;
  }

  public async listarEnRangoReal(desde: Date, hasta: Date): Promise<VentaEntradas[]> {
    return [...this.ventas.values()].filter(
      (v) => v.creadoEn.getTime() >= desde.getTime() && v.creadoEn.getTime() < hasta.getTime(),
    );
  }
}
