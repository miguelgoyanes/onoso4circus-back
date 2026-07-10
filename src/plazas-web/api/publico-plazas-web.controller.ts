import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PlazaWebService } from '../application/plaza-web.service';
import { FuncionWebService } from '../application/funcion-web.service';
import { PlazaPublicaWeb, toPlazaPublicaWeb } from './plaza-web-publico.presenter';

// Sin @UseGuards/@Roles a propósito: es el endpoint que consume circusnova.es (la web
// pública, sin login) para sustituir el JSON estático que se editaba a mano.
@Controller('publico/plazas-web')
export class PublicoPlazasWebController {
  constructor(
    private readonly plazaWebService: PlazaWebService,
    private readonly funcionWebService: FuncionWebService,
  ) {}

  @Get()
  public async listar(@Req() req: Request): Promise<{ plazas: PlazaPublicaWeb[] }> {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const plazasWeb = await this.plazaWebService.listar();

    const plazas = await Promise.all(
      plazasWeb.map(async (plazaWeb) => {
        const funciones = await this.funcionWebService.listarPorPlazaWeb(plazaWeb.id);
        return toPlazaPublicaWeb(plazaWeb, funciones, baseUrl);
      }),
    );

    // Prioridad = la plaza con la función futura más próxima primero — no hay campo de
    // orden manual (el usuario lo descartó a propósito, ver memoria del módulo); las que ya
    // no tienen funciones futuras van al final, en vez de excluirlas (el frontend público
    // ya filtra por fecha, así se mantiene toda la lógica de filtrado solo en un sitio).
    const hoy = new Date().toISOString().slice(0, 10);
    function proximaFecha(plaza: PlazaPublicaWeb): string {
      const futuras = plaza.funciones.map((f) => f.fecha).filter((fecha) => fecha >= hoy);
      return futuras.length > 0 ? futuras.sort()[0] : '9999-99-99';
    }
    plazas.sort((a, b) => proximaFecha(a).localeCompare(proximaFecha(b)));

    return { plazas };
  }
}
