import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CategoriaActivoService } from '../application/categoria-activo.service';
import { AccountingService } from '../../accounting/application/accounting.service';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { CrearCategoriaActivoDto } from './dto/crear-categoria-activo.dto';
import { ActualizarCategoriaActivoDto } from './dto/actualizar-categoria-activo.dto';
import { CategoriaActivoPublica, toCategoriaActivoPublica } from './categoria-activo.presenter';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('categorias-activo')
export class CategoriasActivoController {
  constructor(
    private readonly categoriaActivoService: CategoriaActivoService,
    private readonly accountingService: AccountingService,
  ) {}

  @Get()
  public async listar(): Promise<CategoriaActivoPublica[]> {
    const categorias = await this.categoriaActivoService.listarConUso();
    return Promise.all(categorias.map(({ categoria, usada }) => this.presentar(categoria.id, usada)));
  }

  @Get(':id')
  public async obtener(@Param('id') id: string): Promise<CategoriaActivoPublica> {
    const { categoria, usada } = await this.categoriaActivoService.obtenerConUso(id);
    return this.presentar(categoria.id, usada);
  }

  @Post()
  public async crear(@Body() dto: CrearCategoriaActivoDto): Promise<CategoriaActivoPublica> {
    const categoria = await this.categoriaActivoService.crear(dto.nombre, dto.cuentaContableCode, dto.aplicaIva);
    return this.presentar(categoria.id, false);
  }

  @Patch(':id')
  public async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarCategoriaActivoDto,
  ): Promise<CategoriaActivoPublica> {
    const categoria = await this.categoriaActivoService.actualizar(id, dto.nombre, dto.aplicaIva, dto.cuentaContableCode);
    const { usada } = await this.categoriaActivoService.obtenerConUso(categoria.id);
    return this.presentar(categoria.id, usada);
  }

  @Delete(':id')
  public async eliminar(@Param('id') id: string): Promise<{ ok: true }> {
    await this.categoriaActivoService.eliminar(id);
    return { ok: true };
  }

  private async presentar(categoriaId: string, usada: boolean): Promise<CategoriaActivoPublica> {
    const categoria = await this.categoriaActivoService.obtener(categoriaId);
    const cuenta = await this.accountingService.obtenerCuentaPorId(categoria.cuentaContableId);
    return toCategoriaActivoPublica(categoria, usada, cuenta.code);
  }
}
