import { EntityManager } from 'typeorm';
import { UnitOfWork } from '../application/unit-of-work';

// Para tests con repositorios in-memory — no hay conexión real a la que atarse, así que
// simplemente ejecuta la función sin manager. Los repositorios in-memory ignoran el
// parámetro manager cuando se lo pasan.
export class NoopUnitOfWork implements UnitOfWork {
  public async run<T>(fn: (manager: EntityManager | undefined) => Promise<T>): Promise<T> {
    return fn(undefined);
  }
}
