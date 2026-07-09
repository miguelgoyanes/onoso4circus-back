import Decimal from 'decimal.js';
import { TipoFiscal } from './tipo-fiscal';

export class VentaBarLinea {
  constructor(
    public readonly productoId: string,
    public readonly cantidad: number,
    // Snapshots de Producto.precioVentaPublico/costeUnitarioActual en el momento de vender —
    // el coste es el que se usa para el asiento de coste de producto vendido (600001/300001),
    // independiente de si la línea lleva IVA o no.
    public readonly precioUnitarioAplicado: Decimal,
    public readonly costeUnitarioAplicado: Decimal,
  ) {}
}

export class VentaBar {
  public readonly id: string;
  public readonly paseId: string;
  // Denormalizados desde el pase al crear (paseId -> fechaId -> plazaId), inmutables — igual
  // que en VentaEntradas.
  public readonly fechaId: string;
  public readonly plazaId: string;
  public readonly cuentaCobroId: string;
  // Timestamp de creación, invisible en la UI — solo sirve para listar los pedidos de un
  // pase del más reciente al más antiguo (a diferencia de fecha/RecepcionStock, aquí no hay
  // ningún campo de fecha visible con el que competir o del que derivar el orden).
  public readonly creadoEn: Date;
  public readonly lineas: VentaBarLinea[];
  // Σ round2(cantidad × precioUnitarioAplicado) de cada línea — es el pedido completo de un
  // cliente (varias consumiciones), no una línea suelta como en Taquilla. Nunca cambia al
  // reclasificar IVA: base/iva se derivan de este total hacia atrás.
  public readonly importeTotal: Decimal;
  // Siempre undefined al crear — el IVA se gestiona después, a posteriori, vía
  // reclasificarLote desde el historial (nunca se pide en el momento de vender).
  public readonly tipoFiscal?: TipoFiscal;
  public readonly ivaPercent?: Decimal;
  public readonly baseImponible?: Decimal;
  public readonly importeIva?: Decimal;
  public readonly journalEntryId: string;

  constructor(params: {
    id: string;
    paseId: string;
    fechaId: string;
    plazaId: string;
    cuentaCobroId: string;
    creadoEn: Date;
    lineas: VentaBarLinea[];
    importeTotal: Decimal;
    tipoFiscal?: TipoFiscal;
    ivaPercent?: Decimal;
    baseImponible?: Decimal;
    importeIva?: Decimal;
    journalEntryId: string;
  }) {
    this.id = params.id;
    this.paseId = params.paseId;
    this.fechaId = params.fechaId;
    this.plazaId = params.plazaId;
    this.cuentaCobroId = params.cuentaCobroId;
    this.creadoEn = params.creadoEn;
    this.lineas = params.lineas;
    this.importeTotal = params.importeTotal;
    this.tipoFiscal = params.tipoFiscal;
    this.ivaPercent = params.ivaPercent;
    this.baseImponible = params.baseImponible;
    this.importeIva = params.importeIva;
    this.journalEntryId = params.journalEntryId;
  }

  // paseId/fechaId/plazaId no se tocan aquí, igual que en VentaEntradas.
  public actualizada(params: {
    cuentaCobroId: string;
    lineas: VentaBarLinea[];
    importeTotal: Decimal;
    tipoFiscal?: TipoFiscal;
    ivaPercent?: Decimal;
    baseImponible?: Decimal;
    importeIva?: Decimal;
    journalEntryId: string;
  }): VentaBar {
    return new VentaBar({ ...this, ...params });
  }
}
