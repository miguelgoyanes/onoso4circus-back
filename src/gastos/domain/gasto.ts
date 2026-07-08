import Decimal from 'decimal.js';

export enum TipoGasto {
  PERSONAL = 'PERSONAL',
  PLAZA = 'PLAZA',
  GENERAL = 'GENERAL',
}

export enum EstadoPagoGasto {
  PAGADO = 'PAGADO',
  PENDIENTE_PAGO = 'PENDIENTE_PAGO',
}

export enum CategoriaGastoPlaza {
  MONTAJE = 'MONTAJE',
  ALQUILER_MATERIAL = 'ALQUILER_MATERIAL',
  PERMISO_LICENCIA = 'PERMISO_LICENCIA',
  OTRO = 'OTRO',
}

export enum CategoriaGastoGeneral {
  GESTORIA = 'GESTORIA',
  SEGURO_GENERAL = 'SEGURO_GENERAL',
  MARKETING = 'MARKETING',
  SUSCRIPCION = 'SUSCRIPCION',
  OTRO = 'OTRO',
}

export enum ConceptoGastoDerivado {
  DIETA = 'DIETA',
  SEGURO = 'SEGURO',
  OTRO = 'OTRO',
}

export interface GastoDerivado {
  concepto: ConceptoGastoDerivado;
  importe: Decimal;
}

export class Gasto {
  public readonly id: string;
  public readonly tipo: TipoGasto;
  public readonly fecha: Date;
  public readonly descripcion: string;
  public readonly estadoPago: EstadoPagoGasto;
  public readonly importeTotal: Decimal;
  public readonly plazaId?: string;
  public readonly fechaId?: string;
  public readonly paseId?: string;

  // tipo = PERSONAL
  public readonly empleadoId?: string;
  public readonly asignacionId?: string;
  public readonly importeSalario?: Decimal;
  public readonly costeSs?: Decimal;
  public readonly gastosDerivados: GastoDerivado[];

  // tipo = PLAZA
  public readonly categoriaPlaza?: CategoriaGastoPlaza;

  // tipo = GENERAL
  public readonly categoriaGeneral?: CategoriaGastoGeneral;

  // tipo = PLAZA | GENERAL
  public readonly importe?: Decimal;

  constructor(params: {
    id: string;
    tipo: TipoGasto;
    fecha: Date;
    descripcion: string;
    estadoPago: EstadoPagoGasto;
    importeTotal: Decimal;
    plazaId?: string;
    fechaId?: string;
    paseId?: string;
    empleadoId?: string;
    asignacionId?: string;
    importeSalario?: Decimal;
    costeSs?: Decimal;
    gastosDerivados?: GastoDerivado[];
    categoriaPlaza?: CategoriaGastoPlaza;
    categoriaGeneral?: CategoriaGastoGeneral;
    importe?: Decimal;
  }) {
    this.id = params.id;
    this.tipo = params.tipo;
    this.fecha = params.fecha;
    this.descripcion = params.descripcion;
    this.estadoPago = params.estadoPago;
    this.importeTotal = params.importeTotal;
    this.plazaId = params.plazaId;
    this.fechaId = params.fechaId;
    this.paseId = params.paseId;
    this.empleadoId = params.empleadoId;
    this.asignacionId = params.asignacionId;
    this.importeSalario = params.importeSalario;
    this.costeSs = params.costeSs;
    this.gastosDerivados = params.gastosDerivados ?? [];
    this.categoriaPlaza = params.categoriaPlaza;
    this.categoriaGeneral = params.categoriaGeneral;
    this.importe = params.importe;
  }

  public marcarComoPagado(): Gasto {
    return new Gasto({ ...this, estadoPago: EstadoPagoGasto.PAGADO });
  }
}
