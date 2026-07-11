import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { Rol } from '../domain/usuario';
import { ROLES_KEY } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { VentasBarController } from '../../ventas/api/ventas-bar.controller';
import { VentasEntradasController } from '../../ventas/api/ventas-entradas.controller';
import { PlazasController } from '../../plazas/api/plazas.controller';
import { FechasController } from '../../plazas/api/fechas.controller';
import { PasesController } from '../../plazas/api/pases.controller';
import { TiposEntradaController } from '../../ventas/api/tipos-entrada.controller';
import { ProductosController } from '../../stock/api/productos.controller';
import { TesoreriaController } from '../../tesoreria/api/tesoreria.controller';
import { GastosController } from '../../gastos/api/gastos.controller';
import { ActivosController } from '../../activos/api/activos.controller';

// Replica el "handler primero, luego clase" de Reflector.getAllAndOverride, que es
// justo lo que usa RolesGuard — un método sin @Roles propio hereda el de la clase.
function metadataDe(controller: unknown, metodo: string): Rol[] | undefined {
  const clase = controller as { prototype: Record<string, unknown> };
  const delMetodo = Reflect.getMetadata(ROLES_KEY, clase.prototype[metodo] as object);
  if (delMetodo !== undefined) return delMetodo;
  return Reflect.getMetadata(ROLES_KEY, controller as object);
}

function puedeEjecutar(rol: Rol, requiredRoles: Rol[] | undefined): boolean {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);
  const guard = new RolesGuard(reflector);
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user: { rol } }) }),
  } as unknown as ExecutionContext;
  return guard.canActivate(context);
}

describe('Permisos del rol comercial (OPERADOR): registrar y corregir Bar y Taquilla', () => {
  it('OPERADOR puede listar/crear/editar/eliminar ventas de Bar, pero no reclasificar IVA en lote', () => {
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(VentasBarController, 'listar'))).toBe(true);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(VentasBarController, 'obtener'))).toBe(true);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(VentasBarController, 'crear'))).toBe(true);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(VentasBarController, 'actualizar'))).toBe(true);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(VentasBarController, 'eliminar'))).toBe(true);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(VentasBarController, 'reclasificarLote'))).toBe(false);
  });

  it('OPERADOR puede listar/crear/editar/eliminar ventas de Taquilla, pero no reclasificar IVA en lote', () => {
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(VentasEntradasController, 'listar'))).toBe(true);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(VentasEntradasController, 'obtener'))).toBe(true);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(VentasEntradasController, 'crearLote'))).toBe(true);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(VentasEntradasController, 'actualizar'))).toBe(true);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(VentasEntradasController, 'eliminar'))).toBe(true);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(VentasEntradasController, 'reclasificarLote'))).toBe(false);
  });

  it('OPERADOR tiene CRUD completo de tipos de entrada, y solo lectura de Plazas/Fechas/Pases', () => {
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(PlazasController, 'listar'))).toBe(true);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(PlazasController, 'obtener'))).toBe(true);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(PlazasController, 'listarFechas'))).toBe(true);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(PlazasController, 'crear'))).toBe(false);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(PlazasController, 'actualizar'))).toBe(false);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(PlazasController, 'eliminar'))).toBe(false);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(PlazasController, 'crearFecha'))).toBe(false);

    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(FechasController, 'obtener'))).toBe(true);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(FechasController, 'listarPases'))).toBe(true);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(FechasController, 'actualizar'))).toBe(false);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(FechasController, 'eliminar'))).toBe(false);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(FechasController, 'crearPase'))).toBe(false);

    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(PasesController, 'obtener'))).toBe(true);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(PasesController, 'actualizar'))).toBe(false);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(PasesController, 'eliminar'))).toBe(false);

    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(TiposEntradaController, 'listar'))).toBe(true);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(TiposEntradaController, 'obtener'))).toBe(true);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(TiposEntradaController, 'crear'))).toBe(true);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(TiposEntradaController, 'actualizar'))).toBe(true);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(TiposEntradaController, 'mover'))).toBe(true);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(TiposEntradaController, 'eliminar'))).toBe(true);
  });

  it('OPERADOR tiene una vista de productos sin coste (sin margen), sin acceso a gestión de Stock', () => {
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(ProductosController, 'listarParaVenta'))).toBe(true);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(ProductosController, 'listar'))).toBe(false);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(ProductosController, 'obtener'))).toBe(false);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(ProductosController, 'crear'))).toBe(false);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(ProductosController, 'eliminar'))).toBe(false);
  });

  it('OPERADOR tiene una vista de cuentas de cobro sin saldo, sin acceso a Tesorería', () => {
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(TesoreriaController, 'listarCuentasCobro'))).toBe(true);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(TesoreriaController, 'listarCuentas'))).toBe(false);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(TesoreriaController, 'obtenerCuenta'))).toBe(false);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(TesoreriaController, 'transferir'))).toBe(false);
  });

  it('OPERADOR no tiene ningún acceso a módulos ajenos a Bar/Taquilla (Gastos, Activos)', () => {
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(GastosController, 'listar'))).toBe(false);
    expect(puedeEjecutar(Rol.OPERADOR, metadataDe(ActivosController, 'listar'))).toBe(false);
  });

  it('ADMIN sigue teniendo acceso completo a todo lo anterior, incluida la reclasificación en lote', () => {
    expect(puedeEjecutar(Rol.ADMIN, metadataDe(VentasBarController, 'eliminar'))).toBe(true);
    expect(puedeEjecutar(Rol.ADMIN, metadataDe(VentasBarController, 'reclasificarLote'))).toBe(true);
    expect(puedeEjecutar(Rol.ADMIN, metadataDe(VentasEntradasController, 'eliminar'))).toBe(true);
    expect(puedeEjecutar(Rol.ADMIN, metadataDe(VentasEntradasController, 'reclasificarLote'))).toBe(true);
    expect(puedeEjecutar(Rol.ADMIN, metadataDe(ProductosController, 'listar'))).toBe(true);
    expect(puedeEjecutar(Rol.ADMIN, metadataDe(TesoreriaController, 'listarCuentas'))).toBe(true);
    expect(puedeEjecutar(Rol.ADMIN, metadataDe(GastosController, 'listar'))).toBe(true);
  });
});
