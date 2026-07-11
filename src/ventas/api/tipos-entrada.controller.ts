import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import Decimal from 'decimal.js';
import { TipoEntradaService } from '../application/tipo-entrada.service';
import { VENTA_ENTRADAS_REPOSITORY } from '../application/venta-entradas.repository';
import type { VentaEntradasRepository } from '../application/venta-entradas.repository';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { CrearTipoEntradaDto } from './dto/crear-tipo-entrada.dto';
import { MoverTipoEntradaDto } from './dto/mover-tipo-entrada.dto';
import { TipoEntradaPublico, toTipoEntradaPublico } from './tipo-entrada.presenter';
import { TipoEntrada } from '../domain/tipo-entrada';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.OPERADOR)
@Controller('tipos-entrada')
export class TiposEntradaController {
  constructor(
    private readonly tipoEntradaService: TipoEntradaService,
    @Inject(VENTA_ENTRADAS_REPOSITORY) private readonly ventaEntradasRepository: VentaEntradasRepository,
  ) {}

  @Get()
  public async listar(): Promise<TipoEntradaPublico[]> {
    const tipos = await this.tipoEntradaService.listar();
    return Promise.all(tipos.map((t) => this.presentar(t)));
  }

  @Get(':id')
  public async obtener(@Param('id') id: string): Promise<TipoEntradaPublico> {
    const tipoEntrada = await this.tipoEntradaService.obtener(id);
    return this.presentar(tipoEntrada);
  }

  @Post()
  public async crear(@Body() dto: CrearTipoEntradaDto): Promise<TipoEntradaPublico> {
    const tipoEntrada = await this.tipoEntradaService.crear(
      dto.nombre,
      new Decimal(dto.precio),
      dto.aplicaIva,
      dto.color,
      dto.modalidad,
    );
    return this.presentar(tipoEntrada);
  }

  @Patch(':id')
  public async actualizar(@Param('id') id: string, @Body() dto: CrearTipoEntradaDto): Promise<TipoEntradaPublico> {
    const tipoEntrada = await this.tipoEntradaService.actualizar(
      id,
      dto.nombre,
      new Decimal(dto.precio),
      dto.aplicaIva,
      dto.color,
      dto.modalidad,
    );
    return this.presentar(tipoEntrada);
  }

  @Post(':id/mover')
  public async mover(@Param('id') id: string, @Body() dto: MoverTipoEntradaDto): Promise<TipoEntradaPublico[]> {
    const tipos = await this.tipoEntradaService.mover(id, dto.direccion);
    return Promise.all(tipos.map((t) => this.presentar(t)));
  }

  @Post(':id/desactivar')
  public async desactivar(@Param('id') id: string): Promise<TipoEntradaPublico> {
    const tipoEntrada = await this.tipoEntradaService.desactivar(id);
    return this.presentar(tipoEntrada);
  }

  @Post(':id/activar')
  public async activar(@Param('id') id: string): Promise<TipoEntradaPublico> {
    const tipoEntrada = await this.tipoEntradaService.activar(id);
    return this.presentar(tipoEntrada);
  }

  @Delete(':id')
  public async eliminar(@Param('id') id: string): Promise<{ ok: true }> {
    await this.tipoEntradaService.eliminar(id);
    return { ok: true };
  }

  private async presentar(tipoEntrada: TipoEntrada): Promise<TipoEntradaPublico> {
    const usado = await this.ventaEntradasRepository.existeConTipoEntrada(tipoEntrada.id);
    return toTipoEntradaPublico(tipoEntrada, usado);
  }
}
