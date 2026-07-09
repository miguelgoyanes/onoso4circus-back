import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { ContratoIngreso } from '../domain/contrato-ingreso';
import { EstadoCobro } from '../domain/estado-cobro';
import { TipoFiscal } from '../domain/tipo-fiscal';
import { CONTRATO_INGRESO_REPOSITORY, ContratoIngresoFilter } from './contrato-ingreso.repository';
import type { ContratoIngresoRepository } from './contrato-ingreso.repository';
import { PlazaService } from '../../plazas/application/plaza.service';
import { FechaService } from '../../plazas/application/fecha.service';
import { PaseService } from '../../plazas/application/pase.service';
import { AccountingService } from '../../accounting/application/accounting.service';
import { JournalEntry } from '../../accounting/domain/journal-entry';
import { JournalLine, JournalLineDimensions } from '../../accounting/domain/journal-line';

const CUENTA_INGRESOS_CONTRATO = '702001';
const CUENTA_CLIENTES = '430001';
const CUENTA_IVA_REPERCUTIDO = '477001';

export interface DatosContratoIngreso {
  cliente: string;
  concepto: string;
  fecha: Date;
  plazaId?: string;
  fechaId?: string;
  paseId?: string;
  tipoFiscal?: TipoFiscal;
  // tipoFiscal = B (o no indicado): importe tal cual, sin reparto de IVA.
  importe?: number;
  // tipoFiscal = A: base imponible + % — el backend deriva el resto, nunca confía en un
  // total que mande el cliente (mismo criterio que Gasto/Stock).
  ivaPercent?: number;
  baseImponible?: number;
}

export interface CrearContratoIngresoParams extends DatosContratoIngreso {
  estadoCobro: EstadoCobro;
  cuentaDestinoId?: string;
}

interface RepartoIva {
  baseImponible: Decimal;
  ivaPercent: Decimal;
  importeIva: Decimal;
  importeTotal: Decimal;
}

interface AsientoIngreso {
  lines: JournalLine[];
  total: Decimal;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: Decimal;
  baseImponible?: Decimal;
  importeIva?: Decimal;
}

@Injectable()
export class ContratoIngresoService {
  constructor(
    @Inject(CONTRATO_INGRESO_REPOSITORY) private readonly repository: ContratoIngresoRepository,
    private readonly plazaService: PlazaService,
    private readonly fechaService: FechaService,
    private readonly paseService: PaseService,
    private readonly accountingService: AccountingService,
  ) {}

  public async crear(params: CrearContratoIngresoParams): Promise<ContratoIngreso> {
    if (params.plazaId) await this.plazaService.obtener(params.plazaId);
    if (params.fechaId) await this.fechaService.obtener(params.fechaId);
    if (params.paseId) await this.paseService.obtener(params.paseId);
    if (params.estadoCobro === EstadoCobro.COBRADO && !params.cuentaDestinoId) {
      throw new BadRequestException('cuentaDestinoId es obligatorio cuando estadoCobro = COBRADO');
    }

    const dimensiones: JournalLineDimensions = {
      plazaId: params.plazaId,
      fechaId: params.fechaId,
      paseId: params.paseId,
    };
    const asiento = await this.construirLineasIngreso(params, dimensiones);

    const cuentaContrapartida =
      params.estadoCobro === EstadoCobro.COBRADO
        ? await this.accountingService.obtenerCuentaPorId(params.cuentaDestinoId!)
        : await this.accountingService.obtenerCuentaPorCodigo(CUENTA_CLIENTES);
    asiento.lines.push(new JournalLine({ account: cuentaContrapartida, debit: asiento.total, dimensions: dimensiones }));

    const journalEntryId = randomUUID();
    await this.accountingService.post(
      new JournalEntry({
        id: journalEntryId,
        date: params.fecha,
        description: `Contrato: ${params.cliente} — ${params.concepto}`,
        lines: asiento.lines,
      }),
    );

    const contrato = new ContratoIngreso({
      id: randomUUID(),
      cliente: params.cliente,
      concepto: params.concepto,
      importe: asiento.total,
      fecha: params.fecha,
      estadoCobro: params.estadoCobro,
      plazaId: params.plazaId,
      fechaId: params.fechaId,
      paseId: params.paseId,
      cuentaDestinoId: params.estadoCobro === EstadoCobro.COBRADO ? params.cuentaDestinoId : undefined,
      tipoFiscal: asiento.tipoFiscal,
      ivaPercent: asiento.ivaPercent,
      baseImponible: asiento.baseImponible,
      importeIva: asiento.importeIva,
      journalEntryIds: [journalEntryId],
    });
    await this.repository.save(contrato);
    return contrato;
  }

  public async actualizar(id: string, params: DatosContratoIngreso): Promise<ContratoIngreso> {
    const anterior = await this.buscarOFallar(id);
    for (const journalEntryId of anterior.journalEntryIds) {
      await this.accountingService.eliminarAsiento(journalEntryId);
    }

    const dimensiones: JournalLineDimensions = {
      plazaId: anterior.plazaId,
      fechaId: anterior.fechaId,
      paseId: anterior.paseId,
    };
    const asiento = await this.construirLineasIngreso(params, dimensiones);

    // El estado de cobro y la cuenta destino no se editan aquí (eso sigue yendo por
    // cobrar()) — se conservan tal cual estaban.
    const cuentaContrapartida =
      anterior.estadoCobro === EstadoCobro.COBRADO
        ? await this.accountingService.obtenerCuentaPorId(anterior.cuentaDestinoId!)
        : await this.accountingService.obtenerCuentaPorCodigo(CUENTA_CLIENTES);
    asiento.lines.push(new JournalLine({ account: cuentaContrapartida, debit: asiento.total, dimensions: dimensiones }));

    const journalEntryId = randomUUID();
    await this.accountingService.post(
      new JournalEntry({
        id: journalEntryId,
        date: params.fecha,
        description: `Contrato: ${params.cliente} — ${params.concepto}`,
        lines: asiento.lines,
      }),
    );

    const actualizado = anterior.actualizado({
      cliente: params.cliente,
      concepto: params.concepto,
      importe: asiento.total,
      fecha: params.fecha,
      tipoFiscal: asiento.tipoFiscal,
      ivaPercent: asiento.ivaPercent,
      baseImponible: asiento.baseImponible,
      importeIva: asiento.importeIva,
      journalEntryIds: [journalEntryId],
    });
    await this.repository.save(actualizado);
    return actualizado;
  }

  public async cobrar(id: string, cuentaDestinoId: string): Promise<ContratoIngreso> {
    const contrato = await this.buscarOFallar(id);
    if (contrato.estadoCobro !== EstadoCobro.PENDIENTE_COBRO) {
      throw new ConflictException('El contrato ya está cobrado');
    }

    const cuentaClientes = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_CLIENTES);
    const cuentaDestino = await this.accountingService.obtenerCuentaPorId(cuentaDestinoId);
    const dimensiones: JournalLineDimensions = {
      plazaId: contrato.plazaId,
      fechaId: contrato.fechaId,
      paseId: contrato.paseId,
    };

    const journalEntryId = randomUUID();
    await this.accountingService.post(
      new JournalEntry({
        id: journalEntryId,
        date: new Date(),
        description: `Cobro de contrato pendiente: ${contrato.cliente}`,
        lines: [
          new JournalLine({ account: cuentaDestino, debit: contrato.importe, dimensions: dimensiones }),
          new JournalLine({ account: cuentaClientes, credit: contrato.importe, dimensions: dimensiones }),
        ],
      }),
    );

    const cobrado = contrato.cobrado(cuentaDestinoId, journalEntryId);
    await this.repository.save(cobrado);
    return cobrado;
  }

  public async eliminar(id: string): Promise<void> {
    const contrato = await this.buscarOFallar(id);
    for (const journalEntryId of contrato.journalEntryIds) {
      await this.accountingService.eliminarAsiento(journalEntryId);
    }
    await this.repository.delete(id);
  }

  public async listar(filter?: ContratoIngresoFilter): Promise<ContratoIngreso[]> {
    return this.repository.findAll(filter);
  }

  public async obtener(id: string): Promise<ContratoIngreso> {
    return this.buscarOFallar(id);
  }

  private async construirLineasIngreso(
    params: DatosContratoIngreso,
    dimensiones: JournalLineDimensions,
  ): Promise<AsientoIngreso> {
    const cuentaIngresos = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_INGRESOS_CONTRATO);
    const lines: JournalLine[] = [];

    if (params.tipoFiscal === TipoFiscal.A) {
      const reparto = this.calcularReparto(params.baseImponible, params.ivaPercent);
      lines.push(new JournalLine({ account: cuentaIngresos, credit: reparto.baseImponible, dimensions: dimensiones }));
      const cuentaIva = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_IVA_REPERCUTIDO);
      lines.push(new JournalLine({ account: cuentaIva, credit: reparto.importeIva, dimensions: dimensiones }));
      return {
        lines,
        total: reparto.importeTotal,
        tipoFiscal: TipoFiscal.A,
        ivaPercent: reparto.ivaPercent,
        baseImponible: reparto.baseImponible,
        importeIva: reparto.importeIva,
      };
    }

    if (params.tipoFiscal === TipoFiscal.B) {
      const importe = this.requerirImporte(params.importe);
      lines.push(new JournalLine({ account: cuentaIngresos, credit: importe, dimensions: dimensiones }));
      return {
        lines,
        total: importe,
        tipoFiscal: TipoFiscal.B,
        ivaPercent: new Decimal(0),
        baseImponible: importe,
        importeIva: new Decimal(0),
      };
    }

    const importe = this.requerirImporte(params.importe);
    lines.push(new JournalLine({ account: cuentaIngresos, credit: importe, dimensions: dimensiones }));
    return { lines, total: importe };
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

  private requerirImporte(importe: number | undefined): Decimal {
    if (importe == null) {
      throw new BadRequestException('importe es obligatorio cuando tipoFiscal = B (o no se aplica IVA)');
    }
    return new Decimal(importe);
  }

  private async buscarOFallar(id: string): Promise<ContratoIngreso> {
    const contrato = await this.repository.findById(id);
    if (!contrato) {
      throw new NotFoundException('Contrato no encontrado');
    }
    return contrato;
  }
}
