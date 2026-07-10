import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { Activo } from '../domain/activo';
import { TipoFiscal } from '../domain/tipo-fiscal';
import { ACTIVO_REPOSITORY, ActivoFilter } from './activo.repository';
import type { ActivoRepository } from './activo.repository';
import { CategoriaActivoService } from './categoria-activo.service';
import { CategoriaActivo } from '../domain/categoria-activo';
import { AccountingService } from '../../accounting/application/accounting.service';
import { Account } from '../../accounting/domain/account';
import { fechaContableDeHoy, JournalEntry } from '../../accounting/domain/journal-entry';
import { JournalLine } from '../../accounting/domain/journal-line';

const CUENTA_IVA_SOPORTADO = '472001';
const CUENTA_AMORTIZACION_ACUMULADA = '281001';
const CUENTA_AMORTIZACION_GASTO = '680001';

interface RepartoIva {
  baseImponible: Decimal;
  ivaPercent: Decimal;
  importeIva: Decimal;
  importeTotal: Decimal;
}

interface AsientoCompra {
  lines: JournalLine[];
  total: Decimal;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: Decimal;
  baseImponible?: Decimal;
  importeIva?: Decimal;
}

export interface DatosEconomicosActivo {
  categoriaId: string;
  fechaCompra: Date;
  cuentaPagoId: string;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: number;
  baseImponible?: number;
  importe?: number;
}

export interface CrearActivoParams extends DatosEconomicosActivo {
  nombre: string;
  vidaUtilAnios: number;
  valorResidual: number;
}

export interface ActualizarActivoParams {
  nombre: string;
  vidaUtilAnios: number;
  valorResidual: number;
  economia?: DatosEconomicosActivo;
}

@Injectable()
export class ActivoService {
  constructor(
    @Inject(ACTIVO_REPOSITORY) private readonly repository: ActivoRepository,
    private readonly categoriaActivoService: CategoriaActivoService,
    private readonly accountingService: AccountingService,
  ) {}

  public async crear(params: CrearActivoParams): Promise<Activo> {
    const categoria = await this.categoriaActivoService.obtener(params.categoriaId);
    const cuentaPago = await this.accountingService.obtenerCuentaPorId(params.cuentaPagoId);
    const asiento = await this.construirAsientoCompra(categoria, cuentaPago, params);

    const valorResidual = new Decimal(params.valorResidual);
    if (valorResidual.isNegative()) {
      throw new BadRequestException('valorResidual no puede ser negativo');
    }
    if (valorResidual.greaterThan(asiento.total)) {
      throw new BadRequestException('valorResidual no puede ser mayor que el coste');
    }
    if (params.vidaUtilAnios <= 0) {
      throw new BadRequestException('vidaUtilAnios debe ser mayor que 0');
    }

    const journalEntryId = randomUUID();
    await this.accountingService.post(
      new JournalEntry({
        id: journalEntryId,
        date: params.fechaCompra,
        description: `Compra de activo: ${params.nombre}`,
        lines: asiento.lines,
      }),
    );

    const activo = new Activo({
      id: randomUUID(),
      categoriaId: params.categoriaId,
      nombre: params.nombre,
      fechaCompra: params.fechaCompra,
      coste: asiento.total,
      cuentaPagoId: params.cuentaPagoId,
      tipoFiscal: asiento.tipoFiscal,
      ivaPercent: asiento.ivaPercent,
      baseImponible: asiento.baseImponible,
      importeIva: asiento.importeIva,
      vidaUtilAnios: params.vidaUtilAnios,
      valorResidual,
      activo: true,
      amortizacionAcumulada: new Decimal(0),
      journalEntryCompraId: journalEntryId,
    });
    await this.repository.save(activo);
    return activo;
  }

  public async actualizar(id: string, params: ActualizarActivoParams): Promise<Activo> {
    const anterior = await this.buscarOFallar(id);
    const valorResidual = new Decimal(params.valorResidual);

    if (!params.economia) {
      const actualizado = anterior.conDatosBasicos(params.nombre, params.vidaUtilAnios, valorResidual);
      await this.repository.save(actualizado);
      return actualizado;
    }

    if (anterior.amortizacionAcumulada.greaterThan(0)) {
      throw new ForbiddenException('No se pueden cambiar los datos económicos de un activo con amortización ya registrada');
    }

    await this.accountingService.eliminarAsiento(anterior.journalEntryCompraId);

    const categoria = await this.categoriaActivoService.obtener(params.economia.categoriaId);
    const cuentaPago = await this.accountingService.obtenerCuentaPorId(params.economia.cuentaPagoId);
    const asiento = await this.construirAsientoCompra(categoria, cuentaPago, params.economia);

    if (valorResidual.greaterThan(asiento.total)) {
      throw new BadRequestException('valorResidual no puede ser mayor que el coste');
    }

    const journalEntryId = randomUUID();
    await this.accountingService.post(
      new JournalEntry({
        id: journalEntryId,
        date: params.economia.fechaCompra,
        description: `Compra de activo: ${params.nombre}`,
        lines: asiento.lines,
      }),
    );

    const actualizado = anterior
      .actualizadaEconomicamente({
        categoriaId: params.economia.categoriaId,
        fechaCompra: params.economia.fechaCompra,
        coste: asiento.total,
        cuentaPagoId: params.economia.cuentaPagoId,
        tipoFiscal: asiento.tipoFiscal,
        ivaPercent: asiento.ivaPercent,
        baseImponible: asiento.baseImponible,
        importeIva: asiento.importeIva,
        journalEntryCompraId: journalEntryId,
      })
      .conDatosBasicos(params.nombre, params.vidaUtilAnios, valorResidual);
    await this.repository.save(actualizado);
    return actualizado;
  }

  public async eliminar(id: string): Promise<void> {
    const activo = await this.buscarOFallar(id);
    if (activo.amortizacionAcumulada.greaterThan(0)) {
      throw new ConflictException('No se puede eliminar un activo con amortización registrada; dalo de baja en su lugar');
    }
    await this.accountingService.eliminarAsiento(activo.journalEntryCompraId);
    await this.repository.delete(id);
  }

  public async darDeBaja(id: string): Promise<Activo> {
    const activo = await this.buscarOFallar(id);
    const actualizado = activo.dadaDeBaja();
    await this.repository.save(actualizado);
    return actualizado;
  }

  public async reactivar(id: string): Promise<Activo> {
    const activo = await this.buscarOFallar(id);
    const actualizado = activo.reactivada();
    await this.repository.save(actualizado);
    return actualizado;
  }

  public async listar(filter?: ActivoFilter): Promise<Activo[]> {
    const activos = await this.repository.findAll(filter);
    return Promise.all(activos.map((a) => this.ponerAlDia(a)));
  }

  public async obtener(id: string): Promise<Activo> {
    const activo = await this.buscarOFallar(id);
    return this.ponerAlDia(activo);
  }

  // Se llama desde listar()/obtener() en cada carga — no hay endpoint ni botón para
  // "registrar amortización": si han pasado meses completos desde la última vez, se postea
  // un único asiento que los cubre de golpe, sin intervención humana. Ver el porqué (frente a
  // un cron mensual) en la memoria del proyecto.
  private async ponerAlDia(activo: Activo): Promise<Activo> {
    if (!activo.activo) return activo;
    const amortizable = activo.coste.minus(activo.valorResidual);
    if (activo.amortizacionAcumulada.greaterThanOrEqualTo(amortizable)) return activo;

    const desde = activo.ultimaAmortizacionRegistradaEn ?? activo.fechaCompra;
    const hoy = new Date();
    const meses = this.mesesCompletosTranscurridos(desde, hoy);
    if (meses < 1) return activo;

    const importeMensual = amortizable.dividedBy(activo.vidaUtilAnios * 12);
    const importeTeorico = importeMensual.times(meses).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const importePendiente = amortizable.minus(activo.amortizacionAcumulada);
    const importe = Decimal.min(importeTeorico, importePendiente);
    if (importe.lessThanOrEqualTo(0)) return activo;

    const cuentaGasto = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_AMORTIZACION_GASTO);
    const cuentaAcumulada = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_AMORTIZACION_ACUMULADA);
    await this.accountingService.post(
      new JournalEntry({
        id: randomUUID(),
        date: fechaContableDeHoy(),
        description: `Amortización: ${activo.nombre}`,
        lines: [
          new JournalLine({ account: cuentaGasto, debit: importe }),
          new JournalLine({ account: cuentaAcumulada, credit: importe }),
        ],
      }),
    );

    const actualizado = activo.conAmortizacion(importe, hoy);
    await this.repository.save(actualizado);
    return actualizado;
  }

  private mesesCompletosTranscurridos(desde: Date, hasta: Date): number {
    let meses = (hasta.getUTCFullYear() - desde.getUTCFullYear()) * 12 + (hasta.getUTCMonth() - desde.getUTCMonth());
    if (hasta.getUTCDate() < desde.getUTCDate()) meses -= 1;
    return Math.max(0, meses);
  }

  private async construirAsientoCompra(
    categoria: CategoriaActivo,
    cuentaPago: Account,
    datos: DatosEconomicosActivo,
  ): Promise<AsientoCompra> {
    const cuenta = await this.accountingService.obtenerCuentaPorId(categoria.cuentaContableId);
    const lines: JournalLine[] = [];
    let total: Decimal;
    let resto: Pick<AsientoCompra, 'tipoFiscal' | 'ivaPercent' | 'baseImponible' | 'importeIva'> = {};

    if (categoria.aplicaIva) {
      const tipoFiscalElegido = datos.tipoFiscal ?? TipoFiscal.B;
      if (tipoFiscalElegido === TipoFiscal.A) {
        const reparto = this.calcularReparto(datos.baseImponible, datos.ivaPercent);
        lines.push(new JournalLine({ account: cuenta, debit: reparto.baseImponible }));
        const cuentaIva = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_IVA_SOPORTADO);
        lines.push(new JournalLine({ account: cuentaIva, debit: reparto.importeIva }));
        total = reparto.importeTotal;
        resto = {
          tipoFiscal: TipoFiscal.A,
          ivaPercent: reparto.ivaPercent,
          baseImponible: reparto.baseImponible,
          importeIva: reparto.importeIva,
        };
      } else {
        const importe = this.requerirImporte(datos.importe);
        lines.push(new JournalLine({ account: cuenta, debit: importe }));
        total = importe;
        resto = { tipoFiscal: TipoFiscal.B, ivaPercent: new Decimal(0), baseImponible: importe, importeIva: new Decimal(0) };
      }
    } else {
      const importe = this.requerirImporte(datos.importe);
      lines.push(new JournalLine({ account: cuenta, debit: importe }));
      total = importe;
    }

    lines.push(new JournalLine({ account: cuentaPago, credit: total }));
    return { lines, total, ...resto };
  }

  private calcularReparto(baseImponibleInput?: number, ivaPercentInput?: number): RepartoIva {
    if (baseImponibleInput == null || ivaPercentInput == null) {
      throw new BadRequestException('baseImponible e ivaPercent son obligatorios cuando tipoFiscal = A');
    }
    const baseImponible = new Decimal(baseImponibleInput);
    const ivaPercent = new Decimal(ivaPercentInput);
    const importeIva = baseImponible.times(ivaPercent).dividedBy(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const importeTotal = baseImponible.plus(importeIva);
    return { baseImponible, ivaPercent, importeIva, importeTotal };
  }

  private requerirImporte(importe?: number): Decimal {
    if (importe == null) {
      throw new BadRequestException('importe es obligatorio');
    }
    return new Decimal(importe);
  }

  private async buscarOFallar(id: string): Promise<Activo> {
    const activo = await this.repository.findById(id);
    if (!activo) {
      throw new NotFoundException('Activo no encontrado');
    }
    return activo;
  }
}
