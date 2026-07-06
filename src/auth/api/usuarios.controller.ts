import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UsuarioService } from '../application/usuario.service';
import { Rol } from '../domain/usuario';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { CambiarRolDto } from './dto/cambiar-rol.dto';
import { ResetearPasswordDto } from './dto/resetear-password.dto';
import { UsuarioPublico, toUsuarioPublico } from './usuario.presenter';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Get()
  public async listar(): Promise<UsuarioPublico[]> {
    const usuarios = await this.usuarioService.listar();
    return usuarios.map(toUsuarioPublico);
  }

  @Post()
  public async crear(@Body() dto: CrearUsuarioDto): Promise<UsuarioPublico> {
    const usuario = await this.usuarioService.crear(
      dto.nombre,
      dto.username,
      dto.password,
      dto.rol,
    );
    return toUsuarioPublico(usuario);
  }

  @Patch(':id/desactivar')
  public async desactivar(@Param('id') id: string): Promise<UsuarioPublico> {
    const usuario = await this.usuarioService.desactivar(id);
    return toUsuarioPublico(usuario);
  }

  @Patch(':id/activar')
  public async activar(@Param('id') id: string): Promise<UsuarioPublico> {
    const usuario = await this.usuarioService.reactivar(id);
    return toUsuarioPublico(usuario);
  }

  @Patch(':id/rol')
  public async cambiarRol(
    @Param('id') id: string,
    @Body() dto: CambiarRolDto,
  ): Promise<UsuarioPublico> {
    const usuario = await this.usuarioService.cambiarRol(id, dto.rol);
    return toUsuarioPublico(usuario);
  }

  // Solo el OWNER puede resetear la contraseña de cualquier usuario (incluidos
  // otros ADMIN) sin necesidad de conocer la anterior — sobreescribe el
  // @Roles(ADMIN) de la clase.
  @Roles(Rol.OWNER)
  @Patch(':id/resetear-password')
  public async resetearPassword(
    @Param('id') id: string,
    @Body() dto: ResetearPasswordDto,
  ): Promise<UsuarioPublico> {
    const usuario = await this.usuarioService.resetearPassword(id, dto.password);
    return toUsuarioPublico(usuario);
  }
}
