import { EntityManager } from 'typeorm';

// Abstrae "ejecutar esto en una transacción de BD" para operaciones que tocan varios
// repositorios (ej. reclasificarLote: borra+postea un asiento y guarda la venta, N veces
// seguidas) — sin esto, un fallo a mitad de un lote deja las primeras iteraciones ya
// aplicadas y el resto sin tocar. El manager se pasa opcionalmente a AccountingService/
// VentaBarRepository/VentaEntradasRepository para que, si existe, usen la conexión
// transaccional en vez de la conexión por defecto.
export interface UnitOfWork {
  run<T>(fn: (manager: EntityManager | undefined) => Promise<T>): Promise<T>;
}

export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');
