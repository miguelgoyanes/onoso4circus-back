import { Inject, Injectable } from '@nestjs/common';
import { JournalEntry } from '../domain/journal-entry';
import { JournalLine } from '../domain/journal-line';
import {
  EntriesByDimensionFilter,
  JOURNAL_ENTRY_REPOSITORY,
} from './journal-entry.repository';
import type { JournalEntryRepository } from './journal-entry.repository';

@Injectable()
export class AccountingService {
  constructor(
    @Inject(JOURNAL_ENTRY_REPOSITORY)
    private readonly repository: JournalEntryRepository,
  ) {}

  public async post(entry: JournalEntry): Promise<void> {
    entry.validateBalance();
    await this.repository.save(entry);
  }

  public async entriesByDimension(
    filter: EntriesByDimensionFilter,
  ): Promise<JournalLine[]> {
    return this.repository.findLinesByDimension(filter);
  }
}
