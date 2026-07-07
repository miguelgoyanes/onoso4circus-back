import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../domain/account';
import { AccountRepository } from '../application/account.repository';
import { AccountOrmEntity } from './orm/account.orm-entity';

function toDomain(orm: AccountOrmEntity): Account {
  return new Account(orm.id, orm.name, orm.type, orm.code, orm.esCuentaDeDinero);
}

@Injectable()
export class TypeOrmAccountRepository implements AccountRepository {
  constructor(
    @InjectRepository(AccountOrmEntity)
    private readonly repo: Repository<AccountOrmEntity>,
  ) {}

  public async save(account: Account): Promise<void> {
    await this.repo.save({
      id: account.id,
      name: account.name,
      type: account.type,
      code: account.code,
      esCuentaDeDinero: account.esCuentaDeDinero,
    });
  }

  public async findById(id: string): Promise<Account | null> {
    const orm = await this.repo.findOneBy({ id });
    return orm ? toDomain(orm) : null;
  }

  public async findByCode(code: string): Promise<Account | null> {
    const orm = await this.repo.findOneBy({ code });
    return orm ? toDomain(orm) : null;
  }

  public async findAll(): Promise<Account[]> {
    const accounts = await this.repo.find({ order: { code: 'ASC' } });
    return accounts.map(toDomain);
  }

  public async findCuentasDeDinero(): Promise<Account[]> {
    const accounts = await this.repo.find({
      where: { esCuentaDeDinero: true },
      order: { code: 'ASC' },
    });
    return accounts.map(toDomain);
  }
}
