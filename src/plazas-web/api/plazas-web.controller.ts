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
import { PlazaWebService } from '../application/plaza-web.service';
import { FuncionWebService } from '../application/funcion-web.service';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import { CrearPlazaWebDto } from './dto/crear-plaza-web.dto';
import { CrearFuncionWebDto } from './dto/crear-funcion-web.dto';
import { PlazaWebPublica, toPlazaWebPublica } from './plaza-web.presenter';
import { FuncionWebPublica, toFuncionWebPublica } from './funcion-web.presenter';
import {
  PLAZAS_WEB_UPLOAD_DIR,
  PLAZAS_WEB_UPLOAD_PREFIX,
  plazaWebCartelMulterOptions,
} from './plaza-web-imagen.storage';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('plazas-web')
export class PlazasWebController {
  constructor(
    private readonly plazaWebService: PlazaWebService,
    private readonly funcionWebService: FuncionWebService,
  ) {}

  @Get()
  public async listar(): Promise<PlazaWebPublica[]> {
    const plazasWeb = await this.plazaWebService.listar();
    return plazasWeb.map(toPlazaWebPublica);
  }

  @Get(':id')
  public async obtener(@Param('id') id: string): Promise<PlazaWebPublica> {
    const plazaWeb = await this.plazaWebService.obtener(id);
    return toPlazaWebPublica(plazaWeb);
  }

  @Post()
  public async crear(@Body() dto: CrearPlazaWebDto): Promise<PlazaWebPublica> {
    const plazaWeb = await this.plazaWebService.crear(dto);
    return toPlazaWebPublica(plazaWeb);
  }

  @Patch(':id')
  public async actualizar(@Param('id') id: string, @Body() dto: CrearPlazaWebDto): Promise<PlazaWebPublica> {
    const plazaWeb = await this.plazaWebService.actualizar(id, dto);
    return toPlazaWebPublica(plazaWeb);
  }

  @Post(':id/cartel')
  @UseInterceptors(FileInterceptor('cartel', plazaWebCartelMulterOptions))
  public async subirCartel(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<PlazaWebPublica> {
    if (!file) {
      throw new BadRequestException('Falta el archivo del cartel');
    }
    const anterior = await this.plazaWebService.obtener(id);
    const plazaWeb = await this.plazaWebService.actualizarCartel(id, `${PLAZAS_WEB_UPLOAD_PREFIX}/${file.filename}`);
    if (anterior.cartelUrl) {
      await unlink(join(PLAZAS_WEB_UPLOAD_DIR, anterior.cartelUrl.replace(`${PLAZAS_WEB_UPLOAD_PREFIX}/`, ''))).catch(
        () => undefined,
      );
    }
    return toPlazaWebPublica(plazaWeb);
  }

  @Delete(':id')
  public async eliminar(@Param('id') id: string): Promise<{ ok: true }> {
    await this.plazaWebService.eliminar(id);
    return { ok: true };
  }

  @Get(':plazaWebId/funciones')
  public async listarFunciones(@Param('plazaWebId') plazaWebId: string): Promise<FuncionWebPublica[]> {
    const funciones = await this.funcionWebService.listarPorPlazaWeb(plazaWebId);
    return funciones.map(toFuncionWebPublica);
  }

  @Post(':plazaWebId/funciones')
  public async crearFuncion(
    @Param('plazaWebId') plazaWebId: string,
    @Body() dto: CrearFuncionWebDto,
  ): Promise<FuncionWebPublica> {
    const funcion = await this.funcionWebService.crear(
      plazaWebId,
      new Date(dto.fecha),
      dto.horarios,
      dto.oferta?.descuento,
      dto.oferta?.descripcion,
    );
    return toFuncionWebPublica(funcion);
  }
}
