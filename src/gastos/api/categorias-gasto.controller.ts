import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CategoriaGastoService } from '../application/categoria-gasto.service';
import { AccountingService } from '../../accounting/application/accounting.service';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { CrearCategoriaGastoDto } from './dto/crear-categoria-gasto.dto';
import { ActualizarCategoriaGastoDto } from './dto/actualizar-categoria-gasto.dto';
import { CategoriaGastoPublica, toCategoriaGastoPublica } from './categoria-gasto.presenter';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('categorias-gasto')
export class CategoriasGastoController {
  constructor(
    private readonly categoriaGastoService: CategoriaGastoService,
    private readonly accountingService: AccountingService,
  ) {}

  @Get()
  public async listar(): Promise<CategoriaGastoPublica[]> {
    const categorias = await this.categoriaGastoService.listarConUso();
    return Promise.all(categorias.map(({ categoria, usada }) => this.presentar(categoria.id, usada)));
  }

  @Get(':id')
  public async obtener(@Param('id') id: string): Promise<CategoriaGastoPublica> {
    const { categoria, usada } = await this.categoriaGastoService.obtenerConUso(id);
    return this.presentar(categoria.id, usada);
  }

  @Post()
  public async crear(@Body() dto: CrearCategoriaGastoDto): Promise<CategoriaGastoPublica> {
    const categoria = await this.categoriaGastoService.crear(
      dto.nombre,
      dto.cuentaContableCode,
      dto.requiereEmpleado,
      dto.aplicaIva,
    );
    return this.presentar(categoria.id, false);
  }

  @Patch(':id')
  public async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarCategoriaGastoDto,
  ): Promise<CategoriaGastoPublica> {
    const categoria = await this.categoriaGastoService.actualizar(
      id,
      dto.nombre,
      dto.aplicaIva,
      dto.requiereEmpleado,
      dto.cuentaContableCode,
    );
    const { usada } = await this.categoriaGastoService.obtenerConUso(categoria.id);
    return this.presentar(categoria.id, usada);
  }

  @Delete(':id')
  public async eliminar(@Param('id') id: string): Promise<{ ok: true }> {
    await this.categoriaGastoService.eliminar(id);
    return { ok: true };
  }

  private async presentar(categoriaId: string, usada: boolean): Promise<CategoriaGastoPublica> {
    const categoria = await this.categoriaGastoService.obtener(categoriaId);
    const cuenta = categoria.cuentaContableId
      ? await this.accountingService.obtenerCuentaPorId(categoria.cuentaContableId)
      : null;
    return toCategoriaGastoPublica(categoria, usada, cuenta?.code ?? null);
  }
}
