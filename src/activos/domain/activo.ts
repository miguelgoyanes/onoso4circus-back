import Decimal from 'decimal.js';
import { TipoFiscal } from './tipo-fiscal';

export class Activo {
  public readonly id: string;
  public readonly categoriaId: string;
  public readonly nombre: string;
  public readonly fechaCompra: Date;
  // Total pagado, nunca depende de la clasificación fiscal — si tipoFiscal=A, baseImponible +
  // importeIva se derivan hacia delante desde la base introducida (igual que en Gastos, no
  // hacia atrás desde el total como en Ventas).
  public readonly coste: Decimal;
  public readonly cuentaPagoId: string;
  public readonly tipoFiscal?: TipoFiscal;
  public readonly ivaPercent?: Decimal;
  public readonly baseImponible?: Decimal;
  public readonly importeIva?: Decimal;
  public readonly vidaUtilAnios: number;
  public readonly valorResidual: Decimal;
  // false = dado de baja (vendido/desechado) — deja de amortizar, pero no se borra el histórico.
  public readonly activo: boolean;
  public readonly amortizacionAcumulada: Decimal;
  public readonly ultimaAmortizacionRegistradaEn?: Date;
  public readonly journalEntryCompraId: string;

  constructor(params: {
    id: string;
    categoriaId: string;
    nombre: string;
    fechaCompra: Date;
    coste: Decimal;
    cuentaPagoId: string;
    tipoFiscal?: TipoFiscal;
    ivaPercent?: Decimal;
    baseImponible?: Decimal;
    importeIva?: Decimal;
    vidaUtilAnios: number;
    valorResidual: Decimal;
    activo: boolean;
    amortizacionAcumulada: Decimal;
    ultimaAmortizacionRegistradaEn?: Date;
    journalEntryCompraId: string;
  }) {
    this.id = params.id;
    this.categoriaId = params.categoriaId;
    this.nombre = params.nombre;
    this.fechaCompra = params.fechaCompra;
    this.coste = params.coste;
    this.cuentaPagoId = params.cuentaPagoId;
    this.tipoFiscal = params.tipoFiscal;
    this.ivaPercent = params.ivaPercent;
    this.baseImponible = params.baseImponible;
    this.importeIva = params.importeIva;
    this.vidaUtilAnios = params.vidaUtilAnios;
    this.valorResidual = params.valorResidual;
    this.activo = params.activo;
    this.amortizacionAcumulada = params.amortizacionAcumulada;
    this.ultimaAmortizacionRegistradaEn = params.ultimaAmortizacionRegistradaEn;
    this.journalEntryCompraId = params.journalEntryCompraId;
  }

  // Siempre editable, incluso ya amortizado — no afecta a ningún asiento ya posteado, solo al
  // cálculo de amortización futura (vidaUtilAnios/valorResidual) o es puramente descriptivo.
  public conDatosBasicos(nombre: string, vidaUtilAnios: number, valorResidual: Decimal): Activo {
    return new Activo({ ...this, nombre, vidaUtilAnios, valorResidual });
  }

  // Reemplaza los campos económicos — el servicio solo la llama si amortizacionAcumulada sigue
  // a cero, para no invalidar amortización ya posteada.
  public actualizadaEconomicamente(params: {
    categoriaId: string;
    fechaCompra: Date;
    coste: Decimal;
    cuentaPagoId: string;
    tipoFiscal?: TipoFiscal;
    ivaPercent?: Decimal;
    baseImponible?: Decimal;
    importeIva?: Decimal;
    journalEntryCompraId: string;
  }): Activo {
    return new Activo({ ...this, ...params });
  }

  public conAmortizacion(importe: Decimal, fecha: Date): Activo {
    return new Activo({ ...this, amortizacionAcumulada: this.amortizacionAcumulada.plus(importe), ultimaAmortizacionRegistradaEn: fecha });
  }

  public dadaDeBaja(): Activo {
    return new Activo({ ...this, activo: false });
  }

  public reactivada(): Activo {
    return new Activo({ ...this, activo: true });
  }
}
