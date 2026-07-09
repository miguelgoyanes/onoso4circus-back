import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { AccountingService } from '../accounting/application/accounting.service';
import { Account, AccountType } from '../accounting/domain/account';
import { CategoriaActivoService } from './application/categoria-activo.service';

interface DefinicionCuenta {
  code: string;
  nombre: string;
  type: AccountType;
}

interface DefinicionCategoria {
  nombre: string;
  cuentaCode: string;
}

// Subgrupos reales del PGC español para el grupo 21 "Inmovilizado material" — 210 es
// "Terrenos y bienes naturales" (no aplica, no hay terrenos), así que cada categoría usa el
// subgrupo que de verdad le corresponde en vez de amontonarlas todas bajo un único código:
// 211 Construcciones, 212 Instalaciones técnicas, 213 Maquinaria, 216 Mobiliario,
// 217 Equipos para procesos de información, 218 Elementos de transporte, 219 Otro
// inmovilizado material. (214 Utillaje y 215 Otras instalaciones se dejan sin usar, ninguna
// categoría actual encaja mejor ahí que en las de arriba.)
const CUENTAS: DefinicionCuenta[] = [
  { code: '211001', nombre: 'Carpa y estructura', type: AccountType.ASSET },
  { code: '212001', nombre: 'Iluminación y sonido', type: AccountType.ASSET },
  { code: '213001', nombre: 'Equipo de bar', type: AccountType.ASSET },
  { code: '216001', nombre: 'Mobiliario y sillas', type: AccountType.ASSET },
  { code: '217001', nombre: 'Equipo informático y de gestión', type: AccountType.ASSET },
  { code: '218001', nombre: 'Vehículos', type: AccountType.ASSET },
  { code: '219001', nombre: 'Otro inmovilizado', type: AccountType.ASSET },
  { code: '281001', nombre: 'Amortización acumulada', type: AccountType.ASSET },
  { code: '680001', nombre: 'Amortización, gasto del periodo', type: AccountType.EXPENSE },
];

const CATEGORIAS: DefinicionCategoria[] = [
  { nombre: 'Carpa y estructura', cuentaCode: '211001' },
  { nombre: 'Iluminación y sonido', cuentaCode: '212001' },
  { nombre: 'Equipo de bar', cuentaCode: '213001' },
  { nombre: 'Mobiliario y sillas', cuentaCode: '216001' },
  { nombre: 'Equipo informático y de gestión', cuentaCode: '217001' },
  { nombre: 'Vehículos', cuentaCode: '218001' },
  { nombre: 'Otro inmovilizado', cuentaCode: '219001' },
];

/** Siembra idempotente de las cuentas y categorías predefinidas de Activos — mismo patrón que
 * GastosSeedService/TesoreriaSeedService. 472001 (IVA soportado) ya la siembra Gastos, no se
 * repite aquí; el orden entre módulos no importa porque todos los OnModuleInit terminan antes
 * de que el servidor acepte peticiones. */
@Injectable()
export class ActivosSeedService implements OnModuleInit {
  constructor(
    private readonly accountingService: AccountingService,
    private readonly categoriaActivoService: CategoriaActivoService,
  ) {}

  public async onModuleInit(): Promise<void> {
    const cuentasPorCodigo = new Map<string, Account>();
    for (const def of CUENTAS) {
      cuentasPorCodigo.set(def.code, await this.asegurarCuenta(def));
    }

    for (const def of CATEGORIAS) {
      const cuenta = cuentasPorCodigo.get(def.cuentaCode);
      if (!cuenta) continue;
      await this.categoriaActivoService.sembrarPredefinidaSiNoExiste({
        nombre: def.nombre,
        cuentaContableId: cuenta.id,
        aplicaIva: true,
      });
    }
  }

  private async asegurarCuenta(def: DefinicionCuenta): Promise<Account> {
    try {
      return await this.accountingService.obtenerCuentaPorCodigo(def.code);
    } catch (error) {
      if (!(error instanceof NotFoundException)) throw error;
      return this.accountingService.crearCuenta({
        nombre: def.nombre,
        code: def.code,
        type: def.type,
        esCuentaDeDinero: false,
      });
    }
  }
}
