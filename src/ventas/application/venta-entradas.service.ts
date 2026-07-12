import { randomUUID } from 'crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { VentaEntradas } from '../domain/venta-entradas';
import { OrigenVenta } from '../domain/origen-venta';
import { TipoFiscal } from '../domain/tipo-fiscal';
import { VENTA_ENTRADAS_REPOSITORY, VentaEntradasFilter } from './venta-entradas.repository';
import type { VentaEntradasRepository } from './venta-entradas.repository';
import { TipoEntradaService } from './tipo-entrada.service';
import { PaseService } from '../../plazas/application/pase.service';
import { FechaService } from '../../plazas/application/fecha.service';
import { AccountingService } from '../../accounting/application/accounting.service';
import { JournalEntry } from '../../accounting/domain/journal-entry';
import { JournalLine, JournalLineDimensions } from '../../accounting/domain/journal-line';

const CUENTA_INGRESOS_TAQUILLA = '700001';
const CUENTA_IVA_REPERCUTIDO = '477001';

export interface LineaVentaEntradas {
  tipoEntradaId: string;
  cantidad: number;
  // Cuenta de dinero elegida por Brandon (caja, banco...) — sin restricción por ahora, en el
  // futuro se podrá acotar a las cuentas marcadas para Taquilla (ver plan de sesión).
  cuentaCobroId: string;
  origen: OrigenVenta;
  numeroEntradaDesde?: string;
  numeroEntradaHasta?: string;
  // El total de la línea SIEMPRE es cantidad × TipoEntrada.precio, sin importar la
  // clasificación fiscal. Si tipoFiscal = A, baseImponible/importeIva se derivan de ese total
  // hacia atrás a partir de ivaPercent — nunca se piden ni base ni precio unitario al cliente.
  tipoFiscal?: TipoFiscal;
  ivaPercent?: number;
}

interface AsientoVenta {
  lines: JournalLine[];
  total: Decimal;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: Decimal;
  baseImponible?: Decimal;
  importeIva?: Decimal;
}

@Injectable()
export class VentaEntradasService {
  constructor(
    @Inject(VENTA_ENTRADAS_REPOSITORY) private readonly repository: VentaEntradasRepository,
    private readonly tipoEntradaService: TipoEntradaService,
    private readonly paseService: PaseService,
    private readonly fechaService: FechaService,
    private readonly accountingService: AccountingService,
  ) {}

  public async crearLote(paseId: string, lineas: LineaVentaEntradas[]): Promise<VentaEntradas[]> {
    if (!lineas.length) {
      throw new BadRequestException('lineas no puede estar vacío');
    }
    const pase = await this.paseService.obtener(paseId);
    const fechaEntidad = await this.fechaService.obtener(pase.fechaId);
    const dimensiones: JournalLineDimensions = { plazaId: fechaEntidad.plazaId, fechaId: fechaEntidad.id, paseId };

    const ventas: VentaEntradas[] = [];
    for (const linea of lineas) {
      const tipoEntrada = await this.tipoEntradaService.obtener(linea.tipoEntradaId);
      const asiento = await this.construirAsiento(linea, tipoEntrada.precio, dimensiones);

      const journalEntryId = randomUUID();
      await this.accountingService.post(
        new JournalEntry({
          id: journalEntryId,
          date: fechaEntidad.fecha,
          description: `Venta de entradas (${tipoEntrada.nombre}) x${linea.cantidad}`,
          lines: asiento.lines,
        }),
      );

      const venta = new VentaEntradas({
        id: randomUUID(),
        paseId,
        fechaId: fechaEntidad.id,
        plazaId: fechaEntidad.plazaId,
        tipoEntradaId: linea.tipoEntradaId,
        cantidad: linea.cantidad,
        precioUnitarioAplicado: tipoEntrada.precio,
        cuentaCobroId: linea.cuentaCobroId,
        origen: linea.origen,
        numeroEntradaDesde: linea.numeroEntradaDesde,
        numeroEntradaHasta: linea.numeroEntradaHasta,
        tipoFiscal: asiento.tipoFiscal,
        ivaPercent: asiento.ivaPercent,
        baseImponible: asiento.baseImponible,
        importeIva: asiento.importeIva,
        journalEntryId,
        creadoEn: new Date(),
      });
      await this.repository.save(venta);
      ventas.push(venta);
    }
    return ventas;
  }

  public async actualizar(id: string, cambios: LineaVentaEntradas): Promise<VentaEntradas> {
    const anterior = await this.buscarOFallar(id);
    await this.accountingService.eliminarAsiento(anterior.journalEntryId);

    const pase = await this.paseService.obtener(anterior.paseId);
    const fechaEntidad = await this.fechaService.obtener(pase.fechaId);
    const dimensiones: JournalLineDimensions = {
      plazaId: fechaEntidad.plazaId,
      fechaId: fechaEntidad.id,
      paseId: anterior.paseId,
    };

    const tipoEntrada = await this.tipoEntradaService.obtener(cambios.tipoEntradaId);
    const asiento = await this.construirAsiento(cambios, tipoEntrada.precio, dimensiones);

    const journalEntryId = randomUUID();
    await this.accountingService.post(
      new JournalEntry({
        id: journalEntryId,
        date: fechaEntidad.fecha,
        description: `Venta de entradas (${tipoEntrada.nombre}) x${cambios.cantidad}`,
        lines: asiento.lines,
      }),
    );

    const actualizada = anterior.actualizada({
      tipoEntradaId: cambios.tipoEntradaId,
      cantidad: cambios.cantidad,
      precioUnitarioAplicado: tipoEntrada.precio,
      cuentaCobroId: cambios.cuentaCobroId,
      origen: cambios.origen,
      numeroEntradaDesde: cambios.numeroEntradaDesde,
      numeroEntradaHasta: cambios.numeroEntradaHasta,
      tipoFiscal: asiento.tipoFiscal,
      ivaPercent: asiento.ivaPercent,
      baseImponible: asiento.baseImponible,
      importeIva: asiento.importeIva,
      journalEntryId,
    });
    await this.repository.save(actualizada);
    return actualizada;
  }

  // Reutiliza actualizar() sobre cada id, preservando el importe total ya registrado — solo
  // cambia cómo se reparte entre base imponible e IVA (o si se reparte).
  public async reclasificarLote(ids: string[], tipoFiscal: TipoFiscal, ivaPercent?: number): Promise<VentaEntradas[]> {
    const resultado: VentaEntradas[] = [];
    for (const id of ids) {
      const venta = await this.buscarOFallar(id);
      const actualizada = await this.actualizar(id, {
        tipoEntradaId: venta.tipoEntradaId,
        cantidad: venta.cantidad,
        cuentaCobroId: venta.cuentaCobroId,
        origen: venta.origen,
        numeroEntradaDesde: venta.numeroEntradaDesde,
        numeroEntradaHasta: venta.numeroEntradaHasta,
        tipoFiscal,
        ivaPercent,
      });
      resultado.push(actualizada);
    }
    return resultado;
  }

  public async eliminar(id: string): Promise<void> {
    const venta = await this.buscarOFallar(id);
    await this.accountingService.eliminarAsiento(venta.journalEntryId);
    await this.repository.delete(id);
  }

  public async listar(filter?: VentaEntradasFilter): Promise<VentaEntradas[]> {
    return this.repository.findAll(filter);
  }

  public async contarEnRango(desde: Date, hasta: Date): Promise<number> {
    return this.repository.contarEnRango(desde, hasta);
  }

  public async obtener(id: string): Promise<VentaEntradas> {
    return this.buscarOFallar(id);
  }

  private async construirAsiento(
    linea: LineaVentaEntradas,
    precioTipoEntrada: Decimal,
    dimensiones: JournalLineDimensions,
  ): Promise<AsientoVenta> {
    if (linea.cantidad <= 0) {
      throw new BadRequestException('cantidad debe ser mayor que 0');
    }
    const cuentaIngresos = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_INGRESOS_TAQUILLA);
    const cuentaCobro = await this.accountingService.obtenerCuentaPorId(linea.cuentaCobroId);
    const lines: JournalLine[] = [];

    // El total cobrado nunca depende de la clasificación fiscal: siempre cantidad × precio
    // del tipo de entrada.
    const total = precioTipoEntrada.times(linea.cantidad).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    let resto: Pick<AsientoVenta, 'tipoFiscal' | 'ivaPercent' | 'baseImponible' | 'importeIva'>;

    if (linea.tipoFiscal === TipoFiscal.A) {
      if (linea.ivaPercent == null) {
        throw new BadRequestException('ivaPercent es obligatorio cuando tipoFiscal = A');
      }
      const ivaPercent = new Decimal(linea.ivaPercent);
      const baseImponible = total.dividedBy(new Decimal(1).plus(ivaPercent.dividedBy(100))).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      // importeIva se calcula como complemento exacto (total - base), no como base×%, para
      // garantizar que baseImponible + importeIva === total céntimo a céntimo.
      const importeIva = total.minus(baseImponible);
      lines.push(new JournalLine({ account: cuentaIngresos, credit: baseImponible, dimensions: dimensiones }));
      const cuentaIva = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_IVA_REPERCUTIDO);
      lines.push(new JournalLine({ account: cuentaIva, credit: importeIva, dimensions: dimensiones }));
      resto = { tipoFiscal: TipoFiscal.A, ivaPercent, baseImponible, importeIva };
    } else {
      lines.push(new JournalLine({ account: cuentaIngresos, credit: total, dimensions: dimensiones }));
      resto =
        linea.tipoFiscal === TipoFiscal.B
          ? { tipoFiscal: TipoFiscal.B, ivaPercent: new Decimal(0), baseImponible: total, importeIva: new Decimal(0) }
          : {};
    }

    lines.push(new JournalLine({ account: cuentaCobro, debit: total, dimensions: dimensiones }));
    return { lines, total, ...resto };
  }

  private async buscarOFallar(id: string): Promise<VentaEntradas> {
    const venta = await this.repository.findById(id);
    if (!venta) {
      throw new NotFoundException('Venta de entradas no encontrada');
    }
    return venta;
  }
}
