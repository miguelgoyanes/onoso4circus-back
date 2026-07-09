import { Injectable } from '@nestjs/common';
import { ContratoIngreso } from '../domain/contrato-ingreso';
import { ContratoIngresoFilter, ContratoIngresoRepository } from '../application/contrato-ingreso.repository';

@Injectable()
export class InMemoryContratoIngresoRepository implements ContratoIngresoRepository {
  private readonly contratos = new Map<string, ContratoIngreso>();

  public async save(contrato: ContratoIngreso): Promise<void> {
    this.contratos.set(contrato.id, contrato);
  }

  public async findById(id: string): Promise<ContratoIngreso | null> {
    return this.contratos.get(id) ?? null;
  }

  public async findAll(filter?: ContratoIngresoFilter): Promise<ContratoIngreso[]> {
    return [...this.contratos.values()].filter((c) => {
      if (filter?.plazaId && c.plazaId !== filter.plazaId) return false;
      if (filter?.estadoCobro && c.estadoCobro !== filter.estadoCobro) return false;
      return true;
    });
  }

  public async delete(id: string): Promise<void> {
    this.contratos.delete(id);
  }
}
