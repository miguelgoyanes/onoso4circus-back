import Decimal from 'decimal.js';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { decimalTransformer } from '../../../accounting/infrastructure/orm/decimal.transformer';
import { decimalNullableTransformer } from './decimal-nullable.transformer';
import { TipoProducto } from '../../domain/tipo-producto';

@Entity('productos')
export class ProductoOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar' })
  nombre: string;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    name: 'precio_venta_publico',
    transformer: decimalTransformer,
  })
  precioVentaPublico: Decimal;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    name: 'coste_unitario_actual',
    transformer: decimalTransformer,
  })
  costeUnitarioActual: Decimal;

  @Column({ type: 'int', name: 'cantidad_actual', default: 0 })
  cantidadActual: number;

  @Column({ type: 'boolean', name: 'aplica_iva', default: false })
  aplicaIva: boolean;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'varchar', name: 'imagen_url', nullable: true })
  imagenUrl: string | null;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ type: 'enum', enum: TipoProducto, default: TipoProducto.VENTA_DIRECTA })
  tipo: TipoProducto;

  @Column({ type: 'varchar', name: 'familia_elaborado_id', nullable: true })
  familiaElaboradoId: string | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 4,
    name: 'factor_equivalencia',
    nullable: true,
    transformer: decimalNullableTransformer,
  })
  factorEquivalencia: Decimal | null;
}
