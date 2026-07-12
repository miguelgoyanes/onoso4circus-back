import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import Decimal from 'decimal.js';
import { VentaEntradasService } from '../application/venta-entradas.service';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { CrearLoteVentasEntradasDto } from './dto/crear-lote-ventas-entradas.dto';
import { ActualizarVentaEntradasDto } from './dto/actualizar-venta-entradas.dto';
import { ReclasificarLoteVentasEntradasDto } from './dto/reclasificar-lote-ventas-entradas.dto';
import { ListarVentasEntradasQueryDto } from './dto/listar-ventas-entradas-query.dto';
import { RangoFechasRequeridoQueryDto } from './dto/rango-fechas-query.dto';
import { BuscarCandidatosImporteDto } from './dto/buscar-candidatos-importe.dto';
import { VentaEntradasPublica, toVentaEntradasPublica } from './venta-entradas.presenter';
import { ResumenPorTipoFiscalPublico, toResumenPorTipoFiscalPublico } from './resumen-tipo-fiscal.presenter';
import { CandidatosParaImportePublico, toCandidatosParaImportePublico } from './candidatos-por-importe.presenter';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.OPERADOR)
@Controller('ventas-entradas')
export class VentasEntradasController {
  constructor(private readonly ventaEntradasService: VentaEntradasService) {}

  @Get()
  public async listar(@Query() query: ListarVentasEntradasQueryDto): Promise<VentaEntradasPublica[]> {
    const ventas = await this.ventaEntradasService.listar({
      paseId: query.paseId,
      fechaId: query.fechaId,
      plazaId: query.plazaId,
    });
    return ventas.map(toVentaEntradasPublica);
  }

  // Ruta específica antes de ':id' — si no, ':id' la interceptaría como si "resumen-iva"
  // fuera un id de venta. Para el módulo de reclasificación de IVA (por importe objetivo).
  @Get('resumen-iva')
  @Roles(Rol.ADMIN)
  public async resumenIva(@Query() query: RangoFechasRequeridoQueryDto): Promise<ResumenPorTipoFiscalPublico> {
    const resumen = await this.ventaEntradasService.resumenPorTipoFiscal(new Date(query.desde), new Date(query.hasta));
    return toResumenPorTipoFiscalPublico(resumen);
  }

  @Get(':id')
  public async obtener(@Param('id') id: string): Promise<VentaEntradasPublica> {
    const venta = await this.ventaEntradasService.obtener(id);
    return toVentaEntradasPublica(venta);
  }

  @Post()
  public async crearLote(@Body() dto: CrearLoteVentasEntradasDto): Promise<VentaEntradasPublica[]> {
    const ventas = await this.ventaEntradasService.crearLote(dto.paseId, dto.lineas);
    return ventas.map(toVentaEntradasPublica);
  }

  @Patch('reclasificar-lote')
  @Roles(Rol.ADMIN)
  public async reclasificarLote(@Body() dto: ReclasificarLoteVentasEntradasDto): Promise<VentaEntradasPublica[]> {
    const ventas = await this.ventaEntradasService.reclasificarLote(dto.ids, dto.tipoFiscal, dto.ivaPercent);
    return ventas.map(toVentaEntradasPublica);
  }

  // Solo lectura — ver comentario equivalente en VentasBarController.
  @Post('reclasificar-por-importe/preview')
  @Roles(Rol.ADMIN)
  public async buscarCandidatosParaImporte(@Body() dto: BuscarCandidatosImporteDto): Promise<CandidatosParaImportePublico> {
    const candidatos = await this.ventaEntradasService.buscarCandidatosParaImporte(
      new Date(dto.desde),
      new Date(dto.hasta),
      dto.origen,
      new Decimal(dto.importeObjetivo),
    );
    return toCandidatosParaImportePublico(candidatos);
  }

  @Patch(':id')
  public async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarVentaEntradasDto,
  ): Promise<VentaEntradasPublica> {
    const venta = await this.ventaEntradasService.actualizar(id, dto);
    return toVentaEntradasPublica(venta);
  }

  @Delete(':id')
  public async eliminar(@Param('id') id: string): Promise<{ ok: true }> {
    await this.ventaEntradasService.eliminar(id);
    return { ok: true };
  }
}
