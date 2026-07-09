import { randomUUID } from 'crypto';
import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CategoriaActivo } from '../domain/categoria-activo';
import { CATEGORIA_ACTIVO_REPOSITORY } from './categoria-activo.repository';
import type { CategoriaActivoRepository } from './categoria-activo.repository';
import { ACTIVO_REPOSITORY } from './activo.repository';
import type { ActivoRepository } from './activo.repository';
import { AccountingService } from '../../accounting/application/accounting.service';
import { AccountType } from '../../accounting/domain/account';

export interface CategoriaActivoConUso {
  categoria: CategoriaActivo;
  usada: boolean;
}

@Injectable()
export class CategoriaActivoService {
  constructor(
    @Inject(CATEGORIA_ACTIVO_REPOSITORY) private readonly repository: CategoriaActivoRepository,
    @Inject(ACTIVO_REPOSITORY) private readonly activoRepository: ActivoRepository,
    private readonly accountingService: AccountingService,
  ) {}

  public async crear(nombre: string, cuentaContableCode: string, aplicaIva: boolean): Promise<CategoriaActivo> {
    const cuenta = await this.accountingService.crearCuenta({
      nombre,
      code: cuentaContableCode,
      type: AccountType.ASSET,
      esCuentaDeDinero: false,
    });
    const categoria = new CategoriaActivo(randomUUID(), nombre, cuenta.id, aplicaIva, false);
    await this.repository.save(categoria);
    return categoria;
  }

  public async actualizar(
    id: string,
    nombre: string,
    aplicaIva: boolean,
    cuentaContableCode?: string,
  ): Promise<CategoriaActivo> {
    const categoria = await this.buscarOFallar(id);

    if (categoria.esPredefinida) {
      if (cuentaContableCode) {
        throw new ForbiddenException('No se puede cambiar la cuenta contable de una categoría predefinida');
      }
      const actualizada = categoria.conNombre(nombre);
      await this.repository.save(actualizada);
      return actualizada;
    }

    let cuentaContableId = categoria.cuentaContableId;
    if (cuentaContableCode) {
      const usada = await this.activoRepository.existeConCategoria(id);
      if (usada) {
        throw new ForbiddenException('No se puede cambiar la cuenta contable de una categoría ya usada en algún activo');
      }
      const cuenta = await this.accountingService.crearCuenta({
        nombre,
        code: cuentaContableCode,
        type: AccountType.ASSET,
        esCuentaDeDinero: false,
      });
      cuentaContableId = cuenta.id;
    }

    const actualizada = categoria.conDatos(nombre, aplicaIva, cuentaContableId);
    await this.repository.save(actualizada);
    return actualizada;
  }

  public async eliminar(id: string): Promise<void> {
    await this.buscarOFallar(id);
    const usada = await this.activoRepository.existeConCategoria(id);
    if (usada) {
      throw new ConflictException('No se puede eliminar una categoría con activos vinculados');
    }
    await this.repository.delete(id);
  }

  public async obtener(id: string): Promise<CategoriaActivo> {
    return this.buscarOFallar(id);
  }

  public async obtenerConUso(id: string): Promise<CategoriaActivoConUso> {
    const categoria = await this.buscarOFallar(id);
    const usada = await this.activoRepository.existeConCategoria(id);
    return { categoria, usada };
  }

  public async listarConUso(): Promise<CategoriaActivoConUso[]> {
    const categorias = await this.repository.findAll();
    return Promise.all(
      categorias.map(async (categoria) => ({
        categoria,
        usada: await this.activoRepository.existeConCategoria(categoria.id),
      })),
    );
  }

  /** Solo para el seed de categorías predefinidas — no pasa por crear() porque la cuenta ya
   * se asegura por separado y hay que marcar esPredefinida=true. */
  public async sembrarPredefinidaSiNoExiste(params: {
    nombre: string;
    cuentaContableId: string;
    aplicaIva: boolean;
  }): Promise<void> {
    const existente = await this.repository.findByNombre(params.nombre);
    if (existente) return;
    const categoria = new CategoriaActivo(randomUUID(), params.nombre, params.cuentaContableId, params.aplicaIva, true);
    await this.repository.save(categoria);
  }

  private async buscarOFallar(id: string): Promise<CategoriaActivo> {
    const categoria = await this.repository.findById(id);
    if (!categoria) {
      throw new NotFoundException('Categoría de activo no encontrada');
    }
    return categoria;
  }
}
