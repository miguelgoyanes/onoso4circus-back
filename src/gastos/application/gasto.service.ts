import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import {
  CategoriaGastoGeneral,
  CategoriaGastoPlaza,
  ConceptoGastoDerivado,
  EstadoPagoGasto,
  Gasto,
  GastoDerivado,
  TipoGasto,
} from '../domain/gasto';
import { GASTO_REPOSITORY, GastoFilter } from './gasto.repository';
import type { GastoRepository } from './gasto.repository';
import { PlazaService } from '../../plazas/application/plaza.service';
import { FechaService } from '../../plazas/application/fecha.service';
import { PaseService } from '../../plazas/application/pase.service';
import { AccountingService } from '../../accounting/application/accounting.service';
import { JournalEntry } from '../../accounting/domain/journal-entry';
import { JournalLine, JournalLineDimensions } from '../../accounting/domain/journal-line';

const CUENTA_PERSONAL_CON_PLAZA = '640001';
const CUENTA_PERSONAL_SIN_PLAZA = '641001';
const CUENTA_SEGURIDAD_SOCIAL = '642001';
const CUENTA_GASTOS_DERIVADOS_PERSONAL = '643001';
const CUENTA_GASTO_PLAZA = '620001';
const CUENTA_GASTO_GENERAL = '629001';
const CUENTA_PROVEEDORES = '400001';

export interface CrearGastoParams {
  tipo: TipoGasto;
  fecha: Date;
  descripcion: string;
  estadoPago: EstadoPagoGasto;
  cuentaPagoId?: string;
  plazaId?: string;
  fechaId?: string;
  paseId?: string;
  // tipo = PERSONAL
  empleadoId?: string;
  asignacionId?: string;
  importeSalario?: number;
  costeSs?: number;
  gastosDerivados?: { concepto: ConceptoGastoDerivado; importe: number }[];
  // tipo = PLAZA
  categoriaPlaza?: CategoriaGastoPlaza;
  // tipo = GENERAL
  categoriaGeneral?: CategoriaGastoGeneral;
  // tipo = PLAZA | GENERAL
  importe?: number;
}

@Injectable()
export class GastoService {
  constructor(
    @Inject(GASTO_REPOSITORY) private readonly repository: GastoRepository,
    private readonly plazaService: PlazaService,
    private readonly fechaService: FechaService,
    private readonly paseService: PaseService,
    private readonly accountingService: AccountingService,
  ) {}

  public async crear(params: CrearGastoParams): Promise<Gasto> {
    if (params.plazaId) await this.plazaService.obtener(params.plazaId);
    if (params.fechaId) await this.fechaService.obtener(params.fechaId);
    if (params.paseId) await this.paseService.obtener(params.paseId);

    if (params.estadoPago === EstadoPagoGasto.PAGADO && !params.cuentaPagoId) {
      throw new BadRequestException('cuentaPagoId es obligatorio cuando estadoPago = PAGADO');
    }

    const dimensionesBase: JournalLineDimensions = {
      plazaId: params.plazaId,
      fechaId: params.fechaId,
      paseId: params.paseId,
    };

    const lines: JournalLine[] = [];
    let total = new Decimal(0);

    let importeSalario: Decimal | undefined;
    let costeSs: Decimal | undefined;
    const gastosDerivados: GastoDerivado[] = [];
    let importeGenerico: Decimal | undefined;

    switch (params.tipo) {
      case TipoGasto.PERSONAL: {
        if (!params.empleadoId) {
          throw new BadRequestException('empleadoId es obligatorio para tipo=PERSONAL');
        }
        if (params.importeSalario == null) {
          throw new BadRequestException('importeSalario es obligatorio para tipo=PERSONAL');
        }
        const dimensionesPersonal: JournalLineDimensions = {
          ...dimensionesBase,
          empleadoId: params.empleadoId,
        };

        const cuentaSalarioCode = params.plazaId ? CUENTA_PERSONAL_CON_PLAZA : CUENTA_PERSONAL_SIN_PLAZA;
        const cuentaSalario = await this.accountingService.obtenerCuentaPorCodigo(cuentaSalarioCode);
        importeSalario = new Decimal(params.importeSalario);
        lines.push(
          new JournalLine({ account: cuentaSalario, debit: importeSalario, dimensions: dimensionesPersonal }),
        );
        total = total.plus(importeSalario);

        if (params.costeSs != null) {
          costeSs = new Decimal(params.costeSs);
          const cuentaSs = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_SEGURIDAD_SOCIAL);
          lines.push(new JournalLine({ account: cuentaSs, debit: costeSs, dimensions: dimensionesPersonal }));
          total = total.plus(costeSs);
        }

        if (params.gastosDerivados?.length) {
          const cuentaDerivados = await this.accountingService.obtenerCuentaPorCodigo(
            CUENTA_GASTOS_DERIVADOS_PERSONAL,
          );
          for (const derivado of params.gastosDerivados) {
            const importeDerivado = new Decimal(derivado.importe);
            lines.push(
              new JournalLine({
                account: cuentaDerivados,
                debit: importeDerivado,
                dimensions: { ...dimensionesPersonal, categoryTag: derivado.concepto },
              }),
            );
            total = total.plus(importeDerivado);
            gastosDerivados.push({ concepto: derivado.concepto, importe: importeDerivado });
          }
        }
        break;
      }

      case TipoGasto.PLAZA: {
        if (!params.categoriaPlaza) {
          throw new BadRequestException('categoriaPlaza es obligatorio para tipo=PLAZA');
        }
        if (params.importe == null) {
          throw new BadRequestException('importe es obligatorio para tipo=PLAZA');
        }
        const cuenta = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_GASTO_PLAZA);
        importeGenerico = new Decimal(params.importe);
        lines.push(
          new JournalLine({
            account: cuenta,
            debit: importeGenerico,
            dimensions: { ...dimensionesBase, categoryTag: params.categoriaPlaza },
          }),
        );
        total = importeGenerico;
        break;
      }

      case TipoGasto.GENERAL: {
        if (!params.categoriaGeneral) {
          throw new BadRequestException('categoriaGeneral es obligatorio para tipo=GENERAL');
        }
        if (params.importe == null) {
          throw new BadRequestException('importe es obligatorio para tipo=GENERAL');
        }
        const cuenta = await this.accountingService.obtenerCuentaPorCodigo(CUENTA_GASTO_GENERAL);
        importeGenerico = new Decimal(params.importe);
        lines.push(
          new JournalLine({
            account: cuenta,
            debit: importeGenerico,
            dimensions: { ...dimensionesBase, categoryTag: params.categoriaGeneral },
          }),
        );
        total = importeGenerico;
        break;
      }
    }

    const cuentaCredito =
      params.estadoPago === EstadoPagoGasto.PAGADO
        ? await this.accountingService.obtenerCuentaPorId(params.cuentaPagoId!)
        : await this.accountingService.obtenerCuentaPorCodigo(CUENTA_PROVEEDORES);

    lines.push(
      new JournalLine({
        account: cuentaCredito,
        credit: total,
        dimensions: { ...dimensionesBase, empleadoId: params.empleadoId },
      }),
    );

    await this.accountingService.post(
      new JournalEntry({
        id: randomUUID(),
        date: params.fecha,
        description: `Gasto (${params.tipo}): ${params.descripcion}`,
        lines,
      }),
    );

    const gasto = new Gasto({
      id: randomUUID(),
      tipo: params.tipo,
      fecha: params.fecha,
      descripcion: params.descripcion,
      estadoPago: params.estadoPago,
      importeTotal: total,
      plazaId: params.plazaId,
      fechaId: params.fechaId,
      paseId: params.paseId,
      empleadoId: params.empleadoId,
      asignacionId: params.asignacionId,
      importeSalario,
      costeSs,
      gastosDerivados,
      categoriaPlaza: params.categoriaPlaza,
      categoriaGeneral: params.categoriaGeneral,
      importe: importeGenerico,
    });
    await this.repository.save(gasto);
    return gasto;
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

    await this.accountingService.post(
      new JournalEntry({
        id: randomUUID(),
        date: new Date(),
        description: `Pago de gasto pendiente: ${gasto.descripcion}`,
        lines: [
          new JournalLine({ account: cuentaProveedores, debit: gasto.importeTotal, dimensions: dimensiones }),
          new JournalLine({ account: cuentaPago, credit: gasto.importeTotal, dimensions: dimensiones }),
        ],
      }),
    );

    const pagado = gasto.marcarComoPagado();
    await this.repository.save(pagado);
    return pagado;
  }

  public async listar(filter?: GastoFilter): Promise<Gasto[]> {
    return this.repository.findAll(filter);
  }

  public async obtener(id: string): Promise<Gasto> {
    return this.buscarOFallar(id);
  }

  private async buscarOFallar(id: string): Promise<Gasto> {
    const gasto = await this.repository.findById(id);
    if (!gasto) {
      throw new NotFoundException('Gasto no encontrado');
    }
    return gasto;
  }
}
