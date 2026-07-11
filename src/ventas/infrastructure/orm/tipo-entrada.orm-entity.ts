import Decimal from 'decimal.js';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { decimalTransformer } from '../../../accounting/infrastructure/orm/decimal.transformer';
import { ModalidadTipoEntrada } from '../../domain/modalidad-tipo-entrada';

@Entity('tipos_entrada')
export class TipoEntradaOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar' })
  nombre: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: decimalTransformer })
  precio: Decimal;

  @Column({ type: 'boolean', name: 'aplica_iva' })
  aplicaIva: boolean;

  @Column({ type: 'varchar', nullable: true })
  color: string | null;

  // Default PRESENCIAL: los tipos de entrada ya existentes en producción, creados
  // antes de que existiera este campo, se consideran presenciales al añadir la columna.
  @Column({ type: 'enum', enum: ModalidadTipoEntrada, default: ModalidadTipoEntrada.PRESENCIAL })
  modalidad: ModalidadTipoEntrada;

  @Column({ type: 'int' })
  orden: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
