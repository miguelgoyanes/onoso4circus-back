import { Module } from '@nestjs/common';
import { AccountingService } from './application/accounting.service';
import { JOURNAL_ENTRY_REPOSITORY } from './application/journal-entry.repository';
import { InMemoryJournalEntryRepository } from './infrastructure/in-memory-journal-entry.repository';

@Module({
  providers: [
    AccountingService,
    {
      provide: JOURNAL_ENTRY_REPOSITORY,
      useClass: InMemoryJournalEntryRepository,
    },
  ],
  exports: [AccountingService],
})
export class AccountingModule {}
