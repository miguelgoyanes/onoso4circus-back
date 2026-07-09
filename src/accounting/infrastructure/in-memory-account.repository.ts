import { Injectable } from '@nestjs/common';
import { Account } from '../domain/account';
import { AccountRepository } from '../application/account.repository';

@Injectable()
export class InMemoryAccountRepository implements AccountRepository {
  private readonly accounts = new Map<string, Account>();

  public async save(account: Account): Promise<void> {
    this.accounts.set(account.id, account);
  }

  public async findById(id: string): Promise<Account | null> {
    return this.accounts.get(id) ?? null;
  }

  public async findByCode(code: string): Promise<Account | null> {
    return [...this.accounts.values()].find((a) => a.code === code) ?? null;
  }

  public async findAll(): Promise<Account[]> {
    return [...this.accounts.values()];
  }

  public async findCuentasDeDinero(): Promise<Account[]> {
    return [...this.accounts.values()].filter((a) => a.esCuentaDeDinero);
  }

  public async delete(id: string): Promise<void> {
    this.accounts.delete(id);
  }
}
