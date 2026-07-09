import { randomUUID } from 'crypto';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { TipoEntrada } from '../domain/tipo-entrada';
import { DireccionOrden } from '../domain/direccion-orden';
import { TIPO_ENTRADA_REPOSITORY } from './tipo-entrada.repository';
import type { TipoEntradaRepository } from './tipo-entrada.repository';
import { VENTA_ENTRADAS_REPOSITORY } from './venta-entradas.repository';
import type { VentaEntradasRepository } from './venta-entradas.repository';

@Injectable()
export class TipoEntradaService {
  constructor(
    @Inject(TIPO_ENTRADA_REPOSITORY) private readonly repository: TipoEntradaRepository,
    @Inject(VENTA_ENTRADAS_REPOSITORY) private readonly ventaEntradasRepository: VentaEntradasRepository,
  ) {}

  public async crear(nombre: string, precio: Decimal, aplicaIva: boolean, color?: string): Promise<TipoEntrada> {
    // Se añade al final del orden manual, igual que Producto en Stock.
    const siguienteOrden = (await this.repository.findAll()).length;
    const tipoEntrada = new TipoEntrada(randomUUID(), nombre, precio, aplicaIva, color ?? null, siguienteOrden, true);
    await this.repository.save(tipoEntrada);
    return tipoEntrada;
  }

  public async actualizar(
    id: string,
    nombre: string,
    precio: Decimal,
    aplicaIva: boolean,
    color?: string,
  ): Promise<TipoEntrada> {
    const tipoEntrada = await this.buscarOFallar(id);
    const actualizado = tipoEntrada.conDatos(nombre, precio, aplicaIva, color ?? null);
    await this.repository.save(actualizado);
    return actualizado;
  }

  public async mover(id: string, direccion: DireccionOrden): Promise<TipoEntrada[]> {
    const tipos = await this.repository.findAll();
    const indice = tipos.findIndex((t) => t.id === id);
    if (indice === -1) {
      throw new NotFoundException('Tipo de entrada no encontrado');
    }
    const indiceVecino = direccion === DireccionOrden.ARRIBA ? indice - 1 : indice + 1;
    if (indiceVecino < 0 || indiceVecino >= tipos.length) {
      return tipos;
    }

    const actual = tipos[indice];
    const vecino = tipos[indiceVecino];
    await this.repository.save(actual.conOrden(vecino.orden));
    await this.repository.save(vecino.conOrden(actual.orden));

    return this.repository.findAll();
  }

  public async desactivar(id: string): Promise<TipoEntrada> {
    const tipoEntrada = await this.buscarOFallar(id);
    const actualizado = tipoEntrada.desactivado();
    await this.repository.save(actualizado);
    return actualizado;
  }

  public async activar(id: string): Promise<TipoEntrada> {
    const tipoEntrada = await this.buscarOFallar(id);
    const actualizado = tipoEntrada.activado();
    await this.repository.save(actualizado);
    return actualizado;
  }

  public async eliminar(id: string): Promise<void> {
    await this.buscarOFallar(id);
    const usado = await this.ventaEntradasRepository.existeConTipoEntrada(id);
    if (usado) {
      throw new ConflictException(
        'No se puede eliminar un tipo de entrada con ventas registradas; desactívalo en su lugar',
      );
    }
    await this.repository.delete(id);
  }

  public async listar(): Promise<TipoEntrada[]> {
    return this.repository.findAll();
  }

  public async obtener(id: string): Promise<TipoEntrada> {
    return this.buscarOFallar(id);
  }

  private async buscarOFallar(id: string): Promise<TipoEntrada> {
    const tipoEntrada = await this.repository.findById(id);
    if (!tipoEntrada) {
      throw new NotFoundException('Tipo de entrada no encontrado');
    }
    return tipoEntrada;
  }
}
