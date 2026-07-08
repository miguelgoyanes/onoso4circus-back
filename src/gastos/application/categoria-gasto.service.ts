import { randomUUID } from 'crypto';
import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CategoriaGasto } from '../domain/categoria-gasto';
import { CATEGORIA_GASTO_REPOSITORY } from './categoria-gasto.repository';
import type { CategoriaGastoRepository } from './categoria-gasto.repository';
import { GASTO_REPOSITORY } from './gasto.repository';
import type { GastoRepository } from './gasto.repository';
import { AccountingService } from '../../accounting/application/accounting.service';
import { AccountType } from '../../accounting/domain/account';

export interface CategoriaGastoConUso {
  categoria: CategoriaGasto;
  usada: boolean;
}

@Injectable()
export class CategoriaGastoService {
  constructor(
    @Inject(CATEGORIA_GASTO_REPOSITORY) private readonly repository: CategoriaGastoRepository,
    @Inject(GASTO_REPOSITORY) private readonly gastoRepository: GastoRepository,
    private readonly accountingService: AccountingService,
  ) {}

  public async crear(
    nombre: string,
    cuentaContableCode: string,
    requiereEmpleado: boolean,
    aplicaIva: boolean,
  ): Promise<CategoriaGasto> {
    const cuenta = await this.accountingService.crearCuenta({
      nombre,
      code: cuentaContableCode,
      type: AccountType.EXPENSE,
      esCuentaDeDinero: false,
    });
    const categoria = new CategoriaGasto(randomUUID(), nombre, cuenta.id, requiereEmpleado, false, aplicaIva, false);
    await this.repository.save(categoria);
    return categoria;
  }

  public async actualizar(
    id: string,
    nombre: string,
    aplicaIva: boolean,
    requiereEmpleado: boolean,
    cuentaContableCode?: string,
  ): Promise<CategoriaGasto> {
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
      const usada = await this.gastoRepository.existeConCategoria(id);
      if (usada) {
        throw new ForbiddenException(
          'No se puede cambiar la cuenta contable de una categoría ya usada en algún gasto',
        );
      }
      const cuenta = await this.accountingService.crearCuenta({
        nombre,
        code: cuentaContableCode,
        type: AccountType.EXPENSE,
        esCuentaDeDinero: false,
      });
      cuentaContableId = cuenta.id;
    }

    const actualizada = categoria.conDatos(nombre, aplicaIva, requiereEmpleado, cuentaContableId);
    await this.repository.save(actualizada);
    return actualizada;
  }

  public async eliminar(id: string): Promise<void> {
    await this.buscarOFallar(id);
    const usada = await this.gastoRepository.existeConCategoria(id);
    if (usada) {
      throw new ConflictException('No se puede eliminar una categoría con gastos vinculados');
    }
    await this.repository.delete(id);
  }

  public async obtener(id: string): Promise<CategoriaGasto> {
    return this.buscarOFallar(id);
  }

  public async obtenerConUso(id: string): Promise<CategoriaGastoConUso> {
    const categoria = await this.buscarOFallar(id);
    const usada = await this.gastoRepository.existeConCategoria(id);
    return { categoria, usada };
  }

  public async listarConUso(): Promise<CategoriaGastoConUso[]> {
    const categorias = await this.repository.findAll();
    return Promise.all(
      categorias.map(async (categoria) => ({
        categoria,
        usada: await this.gastoRepository.existeConCategoria(categoria.id),
      })),
    );
  }

  /** Solo para el seed de categorías predefinidas — no pasa por crear() porque no debe generar Account nueva
   * (ya se asegura por separado) ni marcar esPredefinida/esPagoPersonal en false. */
  public async sembrarPredefinidaSiNoExiste(params: {
    nombre: string;
    cuentaContableId: string | null;
    requiereEmpleado: boolean;
    esPagoPersonal: boolean;
    aplicaIva: boolean;
  }): Promise<void> {
    const existente = await this.repository.findByNombre(params.nombre);
    if (existente) return;
    const categoria = new CategoriaGasto(
      randomUUID(),
      params.nombre,
      params.cuentaContableId,
      params.requiereEmpleado,
      params.esPagoPersonal,
      params.aplicaIva,
      true,
    );
    await this.repository.save(categoria);
  }

  private async buscarOFallar(id: string): Promise<CategoriaGasto> {
    const categoria = await this.repository.findById(id);
    if (!categoria) {
      throw new NotFoundException('Categoría de gasto no encontrada');
    }
    return categoria;
  }
}
