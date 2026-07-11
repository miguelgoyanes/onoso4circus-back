import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { EstadoPagoGasto, Gasto, GastoPersonalDetalle } from '../domain/gasto';
import { CategoriaGasto } from '../domain/categoria-gasto';
import { ConceptoPersonal } from '../domain/concepto-personal';
import { TipoFiscal } from '../domain/tipo-fiscal';
import { GASTO_REPOSITORY, GastoFilter } from './gasto.repository';
import type { GastoRepository } from './gasto.repository';
import { CategoriaGastoService } from './categoria-gasto.service';
import { PlazaService } from '../../plazas/application/plaza.service';
import { FechaService } from '../../plazas/application/fecha.service';
import { PaseService } from '../../plazas/application/pase.service';
import { EmpleadoService } from '../../personal/application/empleado.service';
import { Empleado } from '../../personal/domain/empleado';
import { RegimenEmpleado } from '../../personal/domain/regimen-empleado';
import { AccountingService } from '../../accounting/application/accounting.service';
import { fechaContableDeHoy, JournalEntry } from '../../accounting/domain/journal-entry';
import { JournalLine, JournalLineDimensions } from '../../accounting/domain/journal-line';

const CUENTA_PERSONAL_CON_PLAZA = '640001';
const CUENTA_PERSONAL_SIN_PLAZA = '641001';
const CUENTA_SEGURIDAD_SOCIAL = '642001';
const CUENTA_GASTOS_DERIVADOS_PERSONAL = '643001';
const CUENTA_IVA_SOPORTADO = '472001';
const CUENTA_PROVEEDORES = '400001';

export interface ConceptoPersonalInput {
  concepto: ConceptoPersonal;
  importe?: number;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: number;
  baseImponible?: number;
}

export interface CrearGastoParams {
  categoriaId: string;
  fecha: Date;
  descripcion: string;
  estadoPago: EstadoPagoGasto;
  cuentaPagoId?: string;
  plazaId?: string;
  fechaId?: string;
  paseId?: string;
  empleadoId?: string;
  // categoría normal (!categoria.esPagoPersonal)
  importe?: number;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: number;
  baseImponible?: number;
  // categoría personal (categoria.esPagoPersonal)
  conceptos?: ConceptoPersonalInput[];
}

interface RepartoIva {
  baseImponible: Decimal;
  ivaPercent: Decimal;
  importeIva: Decimal;
  importeTotal: Decimal;
}

interface AsientoGasto {
  lines: JournalLine[];
  total: Decimal;
  tipoFiscal?: TipoFiscal;
  ivaPercent?: Decimal;
  baseImponible?: Decimal;
  importeIva?: Decimal;
  detalle: GastoPersonalDetalle[];
}

@Injectable()
export class GastoService {
  constructor(
    @Inject(GASTO_REPOSITORY) private readonly repository: GastoRepository,
    private readonly categoriaGastoService: CategoriaGastoService,
    private readonly plazaService: PlazaService,
    private readonly fechaService: FechaService,
    private readonly paseService: PaseService,
    private readonly empleadoService: EmpleadoService,
    private readonly accountingService: AccountingService,
  ) {}

  public async crear(params: CrearGastoParams): Promise<Gasto> {
    if (params.plazaId) await this.plazaService.obtener(params.plazaId);
    if (params.fechaId) await this.fechaService.obtener(params.fechaId);
    if (params.paseId) await this.paseService.obtener(params.paseId);

    const categoria = await this.categoriaGastoService.obtener(params.categoriaId);

    if (categoria.requiereEmpleado && !params.empleadoId) {
      throw new BadRequestException('empleadoId es obligatorio para esta categoría');
    }
    const empleado = params.empleadoId ? await this.empleadoService.obtener(params.empleadoId) : undefined;

    if (params.estadoPago === EstadoPagoGasto.PAGADO && !params.cuentaPagoId) {
      throw new BadRequestException('cuentaPagoId es obligatorio cuando estadoPago = PAGADO');
    }

    const dimensiones: JournalLineDimensions = {
      plazaId: params.plazaId,
      fechaId: params.fechaId,
      paseId: params.paseId,
      empleadoId: params.empleadoId,
    };

    const asiento = await this.construirAsiento(params, categoria, empleado, dimensiones);

    const cuentaCredito =
      params.estadoPago === EstadoPagoGasto.PAGADO
        ? await this.accountingService.obtenerCuentaPorId(params.cuentaPagoId!)
        : await this.accountingService.obtenerCuentaPorCodigo(CUENTA_PROVEEDORES);
    asiento.lines.push(new JournalLine({ account: cuentaCredito, credit: asiento.total, dimensions: dimensiones }));

    const journalEntryId = randomUUID();
    await this.accountingService.post(
      new JournalEntry({
        id: journalEntryId,
        date: params.fecha,
        description: `Gasto (${categoria.nombre}): ${params.descripcion}`,
        lines: asiento.lines,
      }),
    );

    const gasto = new Gasto({
      id: randomUUID(),
      categoriaId: params.categoriaId,
      fecha: params.fecha,
      descripcion: params.descripcion,
      importe: asiento.total,
      estadoPago: params.estadoPago,
      plazaId: params.plazaId,
      fechaId: params.fechaId,
      paseId: params.paseId,
      empleadoId: params.empleadoId,
      cuentaPagoId: params.cuentaPagoId,
      tipoFiscal: asiento.tipoFiscal,
      ivaPercent: asiento.ivaPercent,
      baseImponible: asiento.baseImponible,
      importeIva: asiento.importeIva,
      detalle: asiento.detalle,
      journalEntryIds: [journalEntryId],
    });
    await this.repository.save(gasto);
    return gasto;
  }

  // Revierte íntegramente los asientos anteriores del gasto y postea uno nuevo que refleja el
  // estado actual (misma lógica de construcción que crear(), incluida categoría/estadoPago —
  // aquí sí son editables, a diferencia de ContratoIngreso). Nunca se reescribe un asiento ya
  // posteado: siempre se revierte hacia adelante y se vuelve a postear.
  public async actualizar(id: string, params: CrearGastoParams): Promise<Gasto> {
    const anterior = await this.buscarOFallar(id);

    if (params.plazaId) await this.plazaService.obtener(params.plazaId);
    if (params.fechaId) await this.fechaService.obtener(params.fechaId);
    if (params.paseId) await this.paseService.obtener(params.paseId);

    const categoria = await this.categoriaGastoService.obtener(params.categoriaId);

    if (categoria.requiereEmpleado && !params.empleadoId) {
      throw new BadRequestException('empleadoId es obligatorio para esta categoría');
    }
    const empleado = params.empleadoId ? await this.empleadoService.obtener(params.empleadoId) : undefined;

    if (params.estadoPago === EstadoPagoGasto.PAGADO && !params.cuentaPagoId) {
      throw new BadRequestException('cuentaPagoId es obligatorio cuando estadoPago = PAGADO');
    }

    const dimensiones: JournalLineDimensions = {
      plazaId: params.plazaId,
      fechaId: params.fechaId,
      paseId: params.paseId,
      empleadoId: params.empleadoId,
    };

    const asiento = await this.construirAsiento(params, categoria, empleado, dimensiones);

    const cuentaCredito =
      params.estadoPago === EstadoPagoGasto.PAGADO
        ? await this.accountingService.obtenerCuentaPorId(params.cuentaPagoId!)
        : await this.accountingService.obtenerCuentaPorCodigo(CUENTA_PROVEEDORES);
    asiento.lines.push(new JournalLine({ account: cuentaCredito, credit: asiento.total, dimensions: dimensiones }));

    for (const journalEntryId of anterior.journalEntryIds) {
      await this.accountingService.eliminarAsiento(journalEntryId);
    }

    const journalEntryId = randomUUID();
    await this.accountingService.post(
      new JournalEntry({
        id: journalEntryId,
        date: params.fecha,
        description: `Gasto (${categoria.nombre}): ${params.descripcion}`,
        lines: asiento.lines,
      }),
    );

    const actualizado = new Gasto({
      id: anterior.id,
      categoriaId: params.categoriaId,
      fecha: params.fecha,
      descripcion: params.descripcion,
      importe: asiento.total,
      estadoPago: params.estadoPago,
      plazaId: params.plazaId,
      fechaId: params.fechaId,
      paseId: params.paseId,
      empleadoId: params.empleadoId,
      cuentaPagoId: params.cuentaPagoId,
      tipoFiscal: asiento.tipoFiscal,
      ivaPercent: asiento.ivaPercent,
      baseImponible: asiento.baseImponible,
      importeIva: asiento.importeIva,
      detalle: asiento.detalle,
      journalEntryIds: [journalEntryId],
    });
    await this.repository.save(actualizado);
    return actualizado;
  }

  private async construirAsiento(
    params: CrearGastoParams,
    categoria: CategoriaGasto,
    empleado: Empleado | undefined,
    dimensiones: JournalLineDimensions,
  ): Promise<AsientoGasto> {
    const lines: JournalLine[] = [];
    let total = new Decimal(0);
    let tipoFiscalGasto: TipoFiscal | undefined;
    let ivaPercentGasto: Decimal | undefined;
    let baseImponibleGasto: Decimal | undefined;
    let importeIvaGasto: Decimal | undefined;
    const detalle: GastoPersonalDetalle[] = [];

    if (categoria.esPagoPersonal) {
      if (!empleado) {
        throw new BadRequestException('empleadoId es obligatorio para esta categoría');
      }
      if (!params.conceptos?.length) {
        throw new BadRequestException('conceptos es obligatorio para esta categoría');
      }

      for (const c of params.conceptos) {
        if (c.concepto === ConceptoPersonal.SALARIO) {
          const cuentaSalarioCode = params.plazaId ? CUENTA_PERSONAL_CON_PLAZA : CUENTA_PERSONAL_SIN_PLAZA;
          const cuentaSalario = await this.accountingService.obtenerCuentaPorCodigo(cuentaSalarioCode);

          if (empleado.regimen === RegimenEmpleado.AUTONOMO) {
            const tipoFiscalSalario = c.tipoFiscal ?? TipoFiscal.B;
            if (tipoFiscalSalario === TipoFiscal.A) {
              const reparto = this.calcularReparto(c.baseImponible, c.ivaPercent);
              lines.push(new JournalLine({ account: cuentaSalario, debit: reparto.baseImponible, dimensions: dimensiones }));
              const cuentaIva = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_IVA_SOPORTADO);
              lines.push(new JournalLine({ account: cuentaIva, debit: reparto.importeIva, dimensions: dimensiones }));
              total = total.plus(reparto.importeTotal);
              tipoFiscalGasto = TipoFiscal.A;
              ivaPercentGasto = reparto.ivaPercent;
              baseImponibleGasto = reparto.baseImponible;
              importeIvaGasto = reparto.importeIva;
              detalle.push(new GastoPersonalDetalle(ConceptoPersonal.SALARIO, reparto.importeTotal));
            } else {
              const importeConcepto = this.requerirImporte(c.importe, 'SALARIO');
              lines.push(new JournalLine({ account: cuentaSalario, debit: importeConcepto, dimensions: dimensiones }));
              total = total.plus(importeConcepto);
              tipoFiscalGasto = TipoFiscal.B;
              ivaPercentGasto = new Decimal(0);
              baseImponibleGasto = importeConcepto;
              importeIvaGasto = new Decimal(0);
              detalle.push(new GastoPersonalDetalle(ConceptoPersonal.SALARIO, importeConcepto));
            }
          } else {
            if (c.tipoFiscal) {
              throw new BadRequestException('Un empleado CUENTA_AJENA nunca lleva IVA en el concepto SALARIO');
            }
            const importeConcepto = this.requerirImporte(c.importe, 'SALARIO');
            lines.push(new JournalLine({ account: cuentaSalario, debit: importeConcepto, dimensions: dimensiones }));
            total = total.plus(importeConcepto);
            detalle.push(new GastoPersonalDetalle(ConceptoPersonal.SALARIO, importeConcepto));
          }
        } else if (c.concepto === ConceptoPersonal.SEGURIDAD_SOCIAL) {
          if (empleado.regimen !== RegimenEmpleado.CUENTA_AJENA) {
            throw new BadRequestException('SEGURIDAD_SOCIAL solo aplica a empleados CUENTA_AJENA');
          }
          const importeConcepto = this.requerirImporte(c.importe, 'SEGURIDAD_SOCIAL');
          const cuentaSs = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_SEGURIDAD_SOCIAL);
          lines.push(new JournalLine({ account: cuentaSs, debit: importeConcepto, dimensions: dimensiones }));
          total = total.plus(importeConcepto);
          detalle.push(new GastoPersonalDetalle(ConceptoPersonal.SEGURIDAD_SOCIAL, importeConcepto));
        } else {
          const importeConcepto = this.requerirImporte(c.importe, c.concepto);
          const cuentaDerivados = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_GASTOS_DERIVADOS_PERSONAL);
          lines.push(
            new JournalLine({
              account: cuentaDerivados,
              debit: importeConcepto,
              dimensions: dimensiones,
            }),
          );
          total = total.plus(importeConcepto);
          detalle.push(new GastoPersonalDetalle(c.concepto, importeConcepto));
        }
      }
    } else {
      if (!categoria.cuentaContableId) {
        throw new ConflictException('La categoría no tiene cuenta contable asignada');
      }
      const cuenta = await this.accountingService.obtenerCuentaPorId(categoria.cuentaContableId);

      if (categoria.aplicaIva) {
        const tipoFiscalElegido = params.tipoFiscal ?? TipoFiscal.B;
        if (tipoFiscalElegido === TipoFiscal.A) {
          const reparto = this.calcularReparto(params.baseImponible, params.ivaPercent);
          lines.push(new JournalLine({ account: cuenta, debit: reparto.baseImponible, dimensions: dimensiones }));
          const cuentaIva = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_IVA_SOPORTADO);
          lines.push(new JournalLine({ account: cuentaIva, debit: reparto.importeIva, dimensions: dimensiones }));
          total = reparto.importeTotal;
          tipoFiscalGasto = TipoFiscal.A;
          ivaPercentGasto = reparto.ivaPercent;
          baseImponibleGasto = reparto.baseImponible;
          importeIvaGasto = reparto.importeIva;
        } else {
          const importeGenerico = this.requerirImporte(params.importe, categoria.nombre);
          lines.push(new JournalLine({ account: cuenta, debit: importeGenerico, dimensions: dimensiones }));
          total = importeGenerico;
          tipoFiscalGasto = TipoFiscal.B;
          ivaPercentGasto = new Decimal(0);
          baseImponibleGasto = importeGenerico;
          importeIvaGasto = new Decimal(0);
        }
      } else {
        const importeGenerico = this.requerirImporte(params.importe, categoria.nombre);
        lines.push(new JournalLine({ account: cuenta, debit: importeGenerico, dimensions: dimensiones }));
        total = importeGenerico;
      }
    }

    return { lines, total, tipoFiscal: tipoFiscalGasto, ivaPercent: ivaPercentGasto, baseImponible: baseImponibleGasto, importeIva: importeIvaGasto, detalle };
  }

  public async pagarPendiente(id: string, cuentaPagoId: string): Promise<Gasto> {
    const gasto = await this.buscarOFallar(id);
    if (gasto.estadoPago !== EstadoPagoGasto.PENDIENTE_PAGO) {
      throw new ConflictException('El gasto ya está pagado');
    }

    const cuentaProveedores = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_PROVEEDORES);
    const cuentaPago = await this.accountingService.obtenerCuentaPorId(cuentaPagoId);
    const dimensiones: JournalLineDimensions = {
      plazaId: gasto.plazaId,
      fechaId: gasto.fechaId,
      paseId: gasto.paseId,
      empleadoId: gasto.empleadoId,
    };

    const journalEntryId = randomUUID();
    await this.accountingService.post(
      new JournalEntry({
        id: journalEntryId,
        date: fechaContableDeHoy(),
        description: `Pago de gasto pendiente: ${gasto.descripcion}`,
        lines: [
          new JournalLine({ account: cuentaProveedores, debit: gasto.importe, dimensions: dimensiones }),
          new JournalLine({ account: cuentaPago, credit: gasto.importe, dimensions: dimensiones }),
        ],
      }),
    );

    const pagado = gasto.marcarComoPagado(journalEntryId);
    await this.repository.save(pagado);
    return pagado;
  }

  public async eliminar(id: string): Promise<void> {
    const gasto = await this.buscarOFallar(id);
    for (const journalEntryId of gasto.journalEntryIds) {
      await this.accountingService.eliminarAsiento(journalEntryId);
    }
    await this.repository.delete(id);
  }

  public async listar(filter?: GastoFilter): Promise<Gasto[]> {
    return this.repository.findAll(filter);
  }

  public async obtener(id: string): Promise<Gasto> {
    return this.buscarOFallar(id);
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

  private requerirImporte(importe: number | undefined, etiqueta: string): Decimal {
    if (importe == null) {
      throw new BadRequestException(`importe es obligatorio para ${etiqueta}`);
    }
    return new Decimal(importe);
  }

  private async buscarOFallar(id: string): Promise<Gasto> {
    const gasto = await this.repository.findById(id);
    if (!gasto) {
      throw new NotFoundException('Gasto no encontrado');
    }
    return gasto;
  }
}
