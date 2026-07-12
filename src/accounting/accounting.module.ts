import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingService } from './application/accounting.service';
import { JOURNAL_ENTRY_REPOSITORY } from './application/journal-entry.repository';
import { ACCOUNT_REPOSITORY } from './application/account.repository';
import { UNIT_OF_WORK } from './application/unit-of-work';
import { TypeOrmJournalEntryRepository } from './infrastructure/typeorm-journal-entry.repository';
import { TypeOrmAccountRepository } from './infrastructure/typeorm-account.repository';
import { TypeOrmUnitOfWork } from './infrastructure/typeorm-unit-of-work';
import { AccountOrmEntity } from './infrastructure/orm/account.orm-entity';
import { JournalEntryOrmEntity } from './infrastructure/orm/journal-entry.orm-entity';
import { JournalLineOrmEntity } from './infrastructure/orm/journal-line.orm-entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountOrmEntity, JournalEntryOrmEntity, JournalLineOrmEntity]),
  ],
  providers: [
    AccountingService,
    {
      provide: JOURNAL_ENTRY_REPOSITORY,
      useClass: TypeOrmJournalEntryRepository,
    },
    {
      provide: ACCOUNT_REPOSITORY,
      useClass: TypeOrmAccountRepository,
    },
    {
      provide: UNIT_OF_WORK,
      useClass: TypeOrmUnitOfWork,
    },
  ],
  exports: [AccountingService, ACCOUNT_REPOSITORY, UNIT_OF_WORK],
})
export class AccountingModule {}
