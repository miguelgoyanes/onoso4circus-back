import { join } from 'path';
import { unlink } from 'fs/promises';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import Decimal from 'decimal.js';
import { ProductoService } from '../application/producto.service';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { MoverProductoDto } from './dto/mover-producto.dto';
import { ProductoPublico, ProductoVentaPublico, toProductoPublico, toProductoVentaPublico } from './producto.presenter';
import { PRODUCTOS_UPLOAD_DIR, PRODUCTOS_UPLOAD_PREFIX, productoImagenMulterOptions } from './producto-imagen.storage';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('productos')
export class ProductosController {
  constructor(private readonly productoService: ProductoService) {}

  @Get()
  public async listar(): Promise<ProductoPublico[]> {
    const productos = await this.productoService.listar();
    return productos.map(toProductoPublico);
  }

  @Get('venta')
  @Roles(Rol.ADMIN, Rol.OPERADOR)
  public async listarParaVenta(): Promise<ProductoVentaPublico[]> {
    const productos = await this.productoService.listar();
    return productos.map(toProductoVentaPublico);
  }

  @Get(':id')
  public async obtener(@Param('id') id: string): Promise<ProductoPublico> {
    const producto = await this.productoService.obtener(id);
    return toProductoPublico(producto);
  }

  @Post()
  public async crear(@Body() dto: CrearProductoDto): Promise<ProductoPublico> {
    const producto = await this.productoService.crear(
      dto.nombre,
      new Decimal(dto.precioVentaPublico),
      dto.aplicaIva,
    );
    return toProductoPublico(producto);
  }

  @Patch(':id')
  public async actualizar(@Param('id') id: string, @Body() dto: CrearProductoDto): Promise<ProductoPublico> {
    const producto = await this.productoService.actualizar(
      id,
      dto.nombre,
      new Decimal(dto.precioVentaPublico),
      dto.aplicaIva,
    );
    return toProductoPublico(producto);
  }

  @Post(':id/imagen')
  @UseInterceptors(FileInterceptor('imagen', productoImagenMulterOptions))
  public async subirImagen(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ProductoPublico> {
    if (!file) {
      throw new BadRequestException('Falta el archivo de imagen');
    }
    const anterior = await this.productoService.obtener(id);
    const producto = await this.productoService.actualizarImagen(id, `${PRODUCTOS_UPLOAD_PREFIX}/${file.filename}`);
    if (anterior.imagenUrl) {
      await unlink(join(PRODUCTOS_UPLOAD_DIR, anterior.imagenUrl.replace(`${PRODUCTOS_UPLOAD_PREFIX}/`, ''))).catch(
        () => undefined,
      );
    }
    return toProductoPublico(producto);
  }

  @Post(':id/mover')
  public async mover(@Param('id') id: string, @Body() dto: MoverProductoDto): Promise<ProductoPublico[]> {
    const productos = await this.productoService.mover(id, dto.direccion);
    return productos.map(toProductoPublico);
  }

  @Post(':id/desactivar')
  public async desactivar(@Param('id') id: string): Promise<ProductoPublico> {
    const producto = await this.productoService.desactivar(id);
    return toProductoPublico(producto);
  }

  @Post(':id/activar')
  public async activar(@Param('id') id: string): Promise<ProductoPublico> {
    const producto = await this.productoService.activar(id);
    return toProductoPublico(producto);
  }

  @Delete(':id')
  public async eliminar(@Param('id') id: string): Promise<{ ok: true }> {
    await this.productoService.eliminar(id);
    return { ok: true };
  }
}
