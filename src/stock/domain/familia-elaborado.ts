// Agrupa las variantes de un producto ELABORADO (ej. palomita pequeña/grande) que comparten
// los mismos insumos — la vinculación insumo↔familia se hace una sola vez, no por variante.
export class FamiliaElaborado {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
  ) {}

  public conNombre(nombre: string): FamiliaElaborado {
    return new FamiliaElaborado(this.id, nombre);
  }
}
