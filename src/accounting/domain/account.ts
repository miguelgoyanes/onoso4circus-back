export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

// Solo tiene sentido en cuentas de dinero creadas desde Tesorería (backend/src/tesoreria/) —
// las cuentas fijas de los demás módulos (700001, 600001, 430001...) se quedan sin definir.
export enum TipoCuentaDinero {
  BANCO = 'BANCO',
  CAJA = 'CAJA',
}

export class Account {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: AccountType,
    public readonly code: string,
    public readonly esCuentaDeDinero: boolean = false,
    public readonly tipoCuentaDinero?: TipoCuentaDinero,
    public readonly activa: boolean = true,
    // Filtran qué cuentas aparecen como cuentaCobroId en Taquilla/Bar — no son una
    // restricción real (en el resto de módulos siguen apareciendo todas las cuentas de
    // dinero activas), solo acotan la lista que se les muestra a esas dos pantallas.
    public readonly usableEnTaquilla: boolean = false,
    public readonly usableEnBar: boolean = false,
  ) {}

  public conDatos(name: string, usableEnTaquilla: boolean, usableEnBar: boolean): Account {
    return new Account(
      this.id,
      name,
      this.type,
      this.code,
      this.esCuentaDeDinero,
      this.tipoCuentaDinero,
      this.activa,
      usableEnTaquilla,
      usableEnBar,
    );
  }

  public desactivada(): Account {
    return new Account(
      this.id,
      this.name,
      this.type,
      this.code,
      this.esCuentaDeDinero,
      this.tipoCuentaDinero,
      false,
      this.usableEnTaquilla,
      this.usableEnBar,
    );
  }

  public activada(): Account {
    return new Account(
      this.id,
      this.name,
      this.type,
      this.code,
      this.esCuentaDeDinero,
      this.tipoCuentaDinero,
      true,
      this.usableEnTaquilla,
      this.usableEnBar,
    );
  }

  // ASSET/EXPENSE aumentan su saldo por el debe; LIABILITY/EQUITY/INCOME por el haber.
  public esDebitoNormal(): boolean {
    return this.type === AccountType.ASSET || this.type === AccountType.EXPENSE;
  }
}
