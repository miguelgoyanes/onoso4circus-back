import { randomUUID } from 'crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FamiliaElaborado } from '../domain/familia-elaborado';
import { VinculacionInsumo } from '../domain/vinculacion-insumo';
import { TipoProducto } from '../domain/tipo-producto';
import { FAMILIA_ELABORADO_REPOSITORY } from './familia-elaborado.repository';
import type { FamiliaElaboradoRepository } from './familia-elaborado.repository';
import { VINCULACION_INSUMO_REPOSITORY } from './vinculacion-insumo.repository';
import type { VinculacionInsumoRepository } from './vinculacion-insumo.repository';
import { ProductoService } from './producto.service';

@Injectable()
export class FamiliaElaboradoService {
  constructor(
    @Inject(FAMILIA_ELABORADO_REPOSITORY) private readonly familiaRepository: FamiliaElaboradoRepository,
    @Inject(VINCULACION_INSUMO_REPOSITORY) private readonly vinculacionRepository: VinculacionInsumoRepository,
    private readonly productoService: ProductoService,
  ) {}

  public async crear(nombre: string): Promise<FamiliaElaborado> {
    const familia = new FamiliaElaborado(randomUUID(), nombre);
    await this.familiaRepository.save(familia);
    return familia;
  }

  public async listar(): Promise<FamiliaElaborado[]> {
    return this.familiaRepository.findAll();
  }

  public async obtener(id: string): Promise<FamiliaElaborado> {
    const familia = await this.familiaRepository.findById(id);
    if (!familia) {
      throw new NotFoundException('Familia de elaborado no encontrada');
    }
    return familia;
  }

  // 1 insumo -> 1 familia siempre — no tendría sentido que el mismo maíz alimentara dos
  // familias de palomitas distintas.
  public async vincularInsumo(familiaElaboradoId: string, insumoId: string): Promise<VinculacionInsumo> {
    await this.obtener(familiaElaboradoId);
    const insumo = await this.productoService.obtener(insumoId);
    if (insumo.tipo !== TipoProducto.INSUMO) {
      throw new BadRequestException('Solo un producto de tipo INSUMO puede vincularse a una familia');
    }
    if (await this.vinculacionRepository.existeConInsumo(insumoId)) {
      throw new BadRequestException('Este insumo ya está vinculado a una familia');
    }
    const vinculacion = new VinculacionInsumo(randomUUID(), insumoId, familiaElaboradoId);
    await this.vinculacionRepository.save(vinculacion);
    return vinculacion;
  }

  public async desvincularInsumo(vinculacionId: string): Promise<void> {
    await this.vinculacionRepository.delete(vinculacionId);
  }

  public async listarInsumosDe(familiaElaboradoId: string): Promise<VinculacionInsumo[]> {
    return this.vinculacionRepository.findByFamilia(familiaElaboradoId);
  }

  // Null si el insumo todavía no está vinculado a ninguna familia — quien llama decide qué
  // hacer (p.ej. CosteElaboradoService no reconoce coste de un lote sin familia conocida).
  public async familiaDeInsumo(insumoId: string): Promise<string | null> {
    const vinculacion = await this.vinculacionRepository.findByInsumo(insumoId);
    return vinculacion?.familiaElaboradoId ?? null;
  }
}
