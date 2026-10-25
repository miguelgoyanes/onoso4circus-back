import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Rol } from '../../auth/domain/usuario';
import { JwtAuthGuard } from '../../auth/api/jwt-auth.guard';
import { RolesGuard } from '../../auth/api/roles.guard';
import { Roles } from '../../auth/api/roles.decorator';
import type { AuthenticatedUser } from '../../auth/api/authenticated-user';
import { BodaConfigService } from '../application/boda-config.service';
import {
  GrupoService,
  PreguntaService,
} from '../application/grupo-pregunta.service';
import { InvitadoService } from '../application/invitado.service';
import { PersonaService } from '../application/persona.service';
import { RespuestaService } from '../application/respuesta.service';
import {
  ActualizarConfigBodaDto,
  ActualizarGrupoDto,
  ActualizarInvitadoDto,
  ActualizarPreguntaDto,
  CrearGrupoDto,
  CrearInvitadoDto,
  CrearPreguntaDto,
  CrearPruebaDto,
  GuardarRespuestasDto,
  ImportarInvitadosDto,
  NombrePersonaDto,
} from './dto/boda.dto';

type PeticionAdmin = Request & { user: AuthenticatedUser };

// Misma protección que el resto del back office: JWT + rol ADMIN (el OWNER también pasa).
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('boda/admin/invitados')
export class BodaInvitadosController {
  constructor(
    private readonly invitadoService: InvitadoService,
    private readonly respuestaService: RespuestaService,
    private readonly personaService: PersonaService,
  ) {}

  @Get()
  public listar() {
    return this.invitadoService.listar();
  }

  @Get('pruebas')
  public listarPruebas() {
    return this.invitadoService.listarPruebas();
  }

  @Post('pruebas')
  public crearPrueba(@Body() dto: CrearPruebaDto) {
    return this.invitadoService.crearPrueba(dto.grupoId, dto.nombre);
  }

  @Post(':id/reiniciar')
  public reiniciar(@Param('id') id: string) {
    return this.invitadoService.reiniciar(id);
  }

  @Delete(':id')
  public async eliminar(@Param('id') id: string) {
    await this.invitadoService.eliminar(id);
    return { ok: true };
  }

  @Get(':id')
  public obtener(@Param('id') id: string) {
    return this.invitadoService.obtener(id);
  }

  @Post()
  public crear(@Body() dto: CrearInvitadoDto) {
    return this.invitadoService.crear(dto);
  }

  @Post('import')
  public importar(@Body() dto: ImportarInvitadosDto) {
    return this.invitadoService.importar(dto.invitados);
  }

  @Patch(':id')
  public actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarInvitadoDto,
  ) {
    return this.invitadoService.actualizar(id, dto);
  }

  @Post(':id/regenerar-token')
  public regenerarToken(@Param('id') id: string, @Req() req: PeticionAdmin) {
    return this.invitadoService.regenerarToken(id, req.user.userId);
  }

  @Post(':id/marcar-enviado')
  public marcarEnviado(@Param('id') id: string, @Req() req: PeticionAdmin) {
    return this.invitadoService.marcarEnviado(id, req.user.userId);
  }

  // Personas de la invitación (pareja, familia…). El titular no se puede quitar.
  @Post(':id/personas')
  public async crearPersona(
    @Param('id') id: string,
    @Body() dto: NombrePersonaDto,
  ) {
    await this.personaService.crear(id, dto.nombre);
    return this.invitadoService.obtener(id);
  }

  @Patch(':id/personas/:personaId')
  public async renombrarPersona(
    @Param('id') id: string,
    @Param('personaId') personaId: string,
    @Body() dto: NombrePersonaDto,
  ) {
    await this.personaService.renombrar(id, personaId, dto.nombre);
    return this.invitadoService.obtener(id);
  }

  @Delete(':id/personas/:personaId')
  public async eliminarPersona(
    @Param('id') id: string,
    @Param('personaId') personaId: string,
  ) {
    await this.personaService.eliminar(id, personaId);
    return this.invitadoService.obtener(id);
  }

  @Get(':id/historial')
  public historial(@Param('id') id: string) {
    return this.invitadoService.historial(id);
  }

  // El admin puede cambiar cualquier respuesta, también pasada la fecha límite; valor null la borra.
  @Patch(':id/respuestas')
  public async guardarRespuestas(
    @Param('id') id: string,
    @Body() dto: GuardarRespuestasDto,
    @Req() req: PeticionAdmin,
  ) {
    await this.invitadoService.obtener(id);
    await this.respuestaService.guardar(
      id,
      dto.respuestas,
      'admin',
      req.user.userId,
    );
    return this.invitadoService.obtener(id);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('boda/admin/grupos')
export class BodaGruposController {
  constructor(private readonly grupoService: GrupoService) {}

  @Get()
  public listar() {
    return this.grupoService.listar();
  }

  @Post()
  public crear(@Body() dto: CrearGrupoDto) {
    return this.grupoService.crear(dto);
  }

  @Patch(':id')
  public actualizar(@Param('id') id: string, @Body() dto: ActualizarGrupoDto) {
    return this.grupoService.actualizar(id, dto);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('boda/admin/preguntas')
export class BodaPreguntasController {
  constructor(private readonly preguntaService: PreguntaService) {}

  @Get()
  public listar() {
    return this.preguntaService.listar();
  }

  @Post()
  public crear(@Body() dto: CrearPreguntaDto) {
    return this.preguntaService.crear(dto);
  }

  @Patch(':id')
  public actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarPreguntaDto,
  ) {
    return this.preguntaService.actualizar(id, dto);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('boda/admin')
export class BodaConfigController {
  constructor(
    private readonly configService: BodaConfigService,
    private readonly invitadoService: InvitadoService,
  ) {}

  @Get('config')
  public obtenerConfig() {
    return this.configService.obtener();
  }

  @Patch('config')
  public actualizarConfig(@Body() dto: ActualizarConfigBodaDto) {
    return this.configService.actualizar({
      ...dto,
      fechaLimiteEdicion:
        dto.fechaLimiteEdicion === undefined
          ? undefined
          : dto.fechaLimiteEdicion === null
            ? null
            : new Date(dto.fechaLimiteEdicion),
    });
  }

  @Get('resumen')
  public resumen() {
    return this.invitadoService.resumen();
  }
}
