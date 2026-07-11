// Vincula un Producto de tipo INSUMO a una FamiliaElaborado — la relación es siempre 1
// insumo -> 1 familia (no tiene sentido que el mismo maíz alimente dos familias distintas
// de palomitas), por eso no hay cantidad/proporción aquí: el reparto por tamaño se hace con
// el factorEquivalencia de cada Producto ELABORADO de la familia, no por insumo.
export class VinculacionInsumo {
  constructor(
    public readonly id: string,
    public readonly insumoId: string,
    public readonly familiaElaboradoId: string,
  ) {}
}
