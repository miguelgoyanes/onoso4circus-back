import { FuncionWeb } from '../domain/funcion-web';

export interface FuncionWebRepository {
  save(funcionWeb: FuncionWeb): Promise<void>;
  findById(id: string): Promise<FuncionWeb | null>;
  findByPlazaWeb(plazaWebId: string): Promise<FuncionWeb[]>;
  delete(id: string): Promise<void>;
}

export const FUNCION_WEB_REPOSITORY = Symbol('FUNCION_WEB_REPOSITORY');
