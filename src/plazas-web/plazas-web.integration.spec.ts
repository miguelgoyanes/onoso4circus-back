import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TypeOrmTestModule } from '../test/typeorm-test.module';
import { PlazasWebModule } from './plazas-web.module';
import { PlazasWebController } from './api/plazas-web.controller';
import { FuncionesWebController } from './api/funciones-web.controller';
import { PublicoPlazasWebController } from './api/publico-plazas-web.controller';
import { PLAZAS_WEB_UPLOAD_DIR, PLAZAS_WEB_UPLOAD_PREFIX } from './api/plaza-web-imagen.storage';
import { TipoVenta } from './domain/tipo-venta';
import { PlazaService } from '../plazas/application/plaza.service';

function requestFalso(): { protocol: string; get: (nombre: string) => string } {
  return { protocol: 'https', get: () => 'circusnova-api.test' };
}

function archivoFalso(nombre: string): Express.Multer.File {
  if (!existsSync(PLAZAS_WEB_UPLOAD_DIR)) mkdirSync(PLAZAS_WEB_UPLOAD_DIR, { recursive: true });
  const ruta = join(PLAZAS_WEB_UPLOAD_DIR, nombre);
  writeFileSync(ruta, 'contenido de prueba');
  return { filename: nombre, path: ruta } as Express.Multer.File;
}

describe('PlazasWeb (integración contra Postgres real)', () => {
  let plazasWebController: PlazasWebController;
  let funcionesWebController: FuncionesWebController;
  let publicoController: PublicoPlazasWebController;
  let plazaService: PlazaService;
  let moduleRef: import('@nestjs/testing').TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmTestModule, PlazasWebModule],
    }).compile();
    await moduleRef.init();

    plazasWebController = moduleRef.get(PlazasWebController);
    funcionesWebController = moduleRef.get(FuncionesWebController);
    publicoController = moduleRef.get(PublicoPlazasWebController);
    plazaService = moduleRef.get(PlazaService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('crea una plaza web vinculada a una plaza contable existente, con funciones y oferta', async () => {
    const testId = randomUUID();
    const plaza = await plazaService.crear(`Cambados test ${testId}`, 'Recinto ferial');

    const plazaWeb = await plazasWebController.crear({
      ciudad: `Cambados ${testId}`,
      ubicacion: 'Enfrente al complejo deportivo O Pombal',
      mapsUrl: 'https://maps.google.com/?q=test',
      entradasUrl: 'https://entradium.com/events/test',
      venta: TipoVenta.AMBOS,
      horasAntes: 2,
      plazaId: plaza.id,
    });
    expect(plazaWeb.plazaId).toBe(plaza.id);
    expect(plazaWeb.cartelUrl).toBeNull();

    const funcionSinOferta = await plazasWebController.crearFuncion(plazaWeb.id, {
      fecha: '2026-07-04',
      horarios: ['21:00'],
    });
    expect(funcionSinOferta.horarios).toEqual(['21:00']);
    expect(funcionSinOferta.descuento).toBeNull();

    const funcionConOferta = await plazasWebController.crearFuncion(plazaWeb.id, {
      fecha: '2026-07-11',
      horarios: ['21:00'],
      oferta: { descuento: 25, descripcion: '25% de descuento' },
    });
    expect(funcionConOferta.descuento).toBe(25);
    expect(funcionConOferta.descuentoDescripcion).toBe('25% de descuento');

    const funciones = await plazasWebController.listarFunciones(plazaWeb.id);
    expect(funciones.map((f) => f.fecha)).toEqual(['2026-07-04', '2026-07-11']);
  });

  it('rechaza vincular una plaza contable que no existe', async () => {
    await expect(
      plazasWebController.crear({
        ciudad: 'Ciudad inventada',
        ubicacion: 'Sitio inventado',
        mapsUrl: 'https://maps.google.com/?q=test',
        entradasUrl: 'https://entradas.test',
        venta: TipoVenta.ONLINE,
        plazaId: randomUUID(),
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('sube el cartel y borra el fichero anterior al reemplazarlo', async () => {
    const testId = randomUUID();
    const plazaWeb = await plazasWebController.crear({
      ciudad: `Sanxenxo ${testId}`,
      ubicacion: 'Paseo marítimo',
      mapsUrl: 'https://maps.google.com/?q=test',
      entradasUrl: 'https://entradas.test',
      venta: TipoVenta.PRESENCIAL,
      horasAntes: 1,
    });

    const primerCartel = archivoFalso(`${testId}-1.jpg`);
    const actualizado1 = await plazasWebController.subirCartel(plazaWeb.id, primerCartel);
    expect(actualizado1.cartelUrl).toBe(`${PLAZAS_WEB_UPLOAD_PREFIX}/${testId}-1.jpg`);
    expect(existsSync(primerCartel.path)).toBe(true);

    const segundoCartel = archivoFalso(`${testId}-2.jpg`);
    const actualizado2 = await plazasWebController.subirCartel(plazaWeb.id, segundoCartel);
    expect(actualizado2.cartelUrl).toBe(`${PLAZAS_WEB_UPLOAD_PREFIX}/${testId}-2.jpg`);
    expect(existsSync(primerCartel.path)).toBe(false);
    expect(existsSync(segundoCartel.path)).toBe(true);
  });

  it('rechaza subirCartel sin archivo', async () => {
    const testId = randomUUID();
    const plazaWeb = await plazasWebController.crear({
      ciudad: `Sin cartel ${testId}`,
      ubicacion: 'Sitio test',
      mapsUrl: 'https://maps.google.com/?q=test',
      entradasUrl: 'https://entradas.test',
      venta: TipoVenta.ONLINE,
    });
    await expect(plazasWebController.subirCartel(plazaWeb.id, undefined)).rejects.toThrow(/falta el archivo/i);
  });

  it('actualiza y elimina una función, y elimina una plaza web (cascada a sus funciones)', async () => {
    const testId = randomUUID();
    const plazaWeb = await plazasWebController.crear({
      ciudad: `Vilagarcía ${testId}`,
      ubicacion: 'Recinto test',
      mapsUrl: 'https://maps.google.com/?q=test',
      entradasUrl: 'https://entradas.test',
      venta: TipoVenta.AMBOS,
      horasAntes: 3,
    });
    const funcion = await plazasWebController.crearFuncion(plazaWeb.id, {
      fecha: '2026-08-01',
      horarios: ['18:00'],
    });

    const actualizada = await funcionesWebController.actualizar(funcion.id, {
      fecha: '2026-08-02',
      horarios: ['18:00', '21:00'],
    });
    expect(actualizada.fecha).toBe('2026-08-02');
    expect(actualizada.horarios).toEqual(['18:00', '21:00']);

    await funcionesWebController.eliminar(funcion.id);
    await expect(funcionesWebController.obtener(funcion.id)).rejects.toThrow(NotFoundException);

    await plazasWebController.eliminar(plazaWeb.id);
    await expect(plazasWebController.obtener(plazaWeb.id)).rejects.toThrow(NotFoundException);
  });

  it('el endpoint público expone el shape que consume circusnova.es (venta en minúsculas, cartel absoluto, sin oferta si no hay descuento)', async () => {
    const testId = randomUUID();
    const plazaWeb = await plazasWebController.crear({
      ciudad: `Sanxenxo público ${testId}`,
      ubicacion: 'Paseo marítimo',
      mapsUrl: 'https://maps.google.com/?q=test',
      entradasUrl: 'https://entradas.test',
      venta: TipoVenta.AMBOS,
      horasAntes: 2,
    });
    const cartel = archivoFalso(`${testId}-publico.jpg`);
    await plazasWebController.subirCartel(plazaWeb.id, cartel);

    await plazasWebController.crearFuncion(plazaWeb.id, { fecha: '2026-09-01', horarios: ['21:00'] });
    await plazasWebController.crearFuncion(plazaWeb.id, {
      fecha: '2026-09-05',
      horarios: ['21:00'],
      oferta: { descuento: 25, descripcion: '25% de descuento' },
    });

    const { plazas } = await publicoController.listar(requestFalso() as never);
    const publica = plazas.find((p) => p.ciudad === `Sanxenxo público ${testId}`)!;

    expect(publica.venta).toBe('ambos');
    expect(publica.cartel).toBe(`https://circusnova-api.test${PLAZAS_WEB_UPLOAD_PREFIX}/${testId}-publico.jpg`);
    expect(publica.funciones.find((f) => f.fecha === '2026-09-01')?.oferta).toBeUndefined();
    expect(publica.funciones.find((f) => f.fecha === '2026-09-05')?.oferta).toEqual({
      descuento: 25,
      descripcion: '25% de descuento',
    });
  });
});
