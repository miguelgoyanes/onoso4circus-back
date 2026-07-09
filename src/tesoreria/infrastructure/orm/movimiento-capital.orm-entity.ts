import Decimal from 'decimal.js';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { TipoMovimientoCapital } from '../../domain/tipo-movimiento-capital';
import { decimalTransformer } from '../../../accounting/infrastructure/orm/decimal.transformer';

@Entity('movimientos_capital')
export class MovimientoCapitalOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar', name: 'cuenta_id' })
  cuentaId: string;

  @Column({ type: 'enum', enum: TipoMovimientoCapital })
  tipo: TipoMovimientoCapital;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: decimalTransformer })
  importe: Decimal;

  @Column({ type: 'varchar', nullable: true })
  concepto: string | null;

  @Column({ type: 'varchar', name: 'journal_entry_id' })
  journalEntryId: string;

  @Column({ type: 'timestamptz' })
  fecha: Date;
}
