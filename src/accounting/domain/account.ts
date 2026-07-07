export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export class Account {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: AccountType,
    public readonly code: string,
    public readonly esCuentaDeDinero: boolean = false,
  ) {}
}
