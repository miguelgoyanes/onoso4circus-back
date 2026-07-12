import Decimal from 'decimal.js';
import { buscarCandidatosParaImporte } from './candidatos-por-importe';

interface ItemDePrueba {
  id: string;
  importe: number;
}

function pool(importes: number[]): ItemDePrueba[] {
  return importes.map((importe, i) => ({ id: `v${i}`, importe }));
}

describe('buscarCandidatosParaImporte', () => {
  it('se acerca al objetivo dentro de un margen razonable con un pool variado', () => {
    // 40 pedidos entre 1 y 15€ — suman bastante más que el objetivo de 200€.
    const importes = Array.from({ length: 40 }, (_, i) => 1 + (i % 15));
    const resultado = buscarCandidatosParaImporte(pool(importes), (item) => new Decimal(item.importe), new Decimal(200));

    expect(resultado.totalAlcanzado.minus(200).abs().lessThanOrEqualTo(2)).toBe(true);
    expect(resultado.ventaIds.length).toBeGreaterThan(0);
  });

  it('nunca se pasa del objetivo cuando el pool tiene margen de sobra para quedarse justo por debajo', () => {
    const importes = Array.from({ length: 60 }, () => 1);
    const resultado = buscarCandidatosParaImporte(pool(importes), (item) => new Decimal(item.importe), new Decimal(37));
    expect(resultado.totalAlcanzado.equals(new Decimal(37))).toBe(true);
  });

  it('con un pool vacío devuelve cero ventas y la diferencia completa', () => {
    const resultado = buscarCandidatosParaImporte([], () => new Decimal(0), new Decimal(500));
    expect(resultado.ventaIds).toEqual([]);
    expect(resultado.totalAlcanzado.equals(0)).toBe(true);
    expect(resultado.diferencia.equals(-500)).toBe(true);
  });

  it('si el individual más cercano queda más cerca del objetivo que no mover nada, lo elige', () => {
    // Objetivo 60: no moverse (0) queda a 60 de distancia; el pedido de 50 queda a solo 10.
    const resultado = buscarCandidatosParaImporte(pool([50, 80, 120]), (item) => new Decimal(item.importe), new Decimal(60));
    expect(resultado.ventaIds).toEqual(['v0']);
    expect(resultado.totalAlcanzado.equals(50)).toBe(true);
  });

  it('con un objetivo mayor que la suma del pool entero, coge todo el pool', () => {
    const resultado = buscarCandidatosParaImporte(pool([10, 20, 30]), (item) => new Decimal(item.importe), new Decimal(1000));
    expect(resultado.ventaIds.sort()).toEqual(['v0', 'v1', 'v2']);
    expect(resultado.totalAlcanzado.equals(60)).toBe(true);
  });
});
