import Decimal from 'decimal.js';

export interface CandidatosParaImporte {
  ventaIds: string[];
  totalAlcanzado: Decimal;
  // totalAlcanzado - importeObjetivo. Positivo = se pasó, negativo = se quedó corto.
  diferencia: Decimal;
}

// Heurística para "encoge N pedidos hasta sumar ~importeObjetivo": no es un problema que
// necesite una solución exacta (el usuario ya acepta un margen de un par de euros), así que
// en vez de un subset-sum por programación dinámica basta con barajar el pool varias veces,
// acumular sin pasarse del objetivo, y quedarse con el barajado que más se acerque. Se
// complementa con el ítem individual más cercano al objetivo, por si el pool tiene pocos
// pedidos y todos superan el objetivo (ahí ningún barajado sin sobrepasar llegaría a nada).
export function buscarCandidatosParaImporte<T extends { id: string }>(
  pool: T[],
  importeDe: (item: T) => Decimal,
  importeObjetivo: Decimal,
  intentos = 200,
): CandidatosParaImporte {
  if (pool.length === 0 || importeObjetivo.lessThanOrEqualTo(0)) {
    return { ventaIds: [], totalAlcanzado: new Decimal(0), diferencia: new Decimal(0).minus(importeObjetivo) };
  }

  const items = pool.map((item) => ({
    id: item.id,
    centimos: importeDe(item).times(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber(),
  }));
  const objetivoCentimos = importeObjetivo.times(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();

  let mejorIds: string[] = [];
  let mejorTotalCentimos = 0;
  let mejorDiferencia = Infinity;

  for (let intento = 0; intento < intentos; intento++) {
    const barajado = [...items].sort(() => Math.random() - 0.5);
    let totalCentimos = 0;
    const ids: string[] = [];
    for (const item of barajado) {
      if (totalCentimos + item.centimos <= objetivoCentimos) {
        totalCentimos += item.centimos;
        ids.push(item.id);
      }
    }
    const diferencia = Math.abs(totalCentimos - objetivoCentimos);
    if (diferencia < mejorDiferencia) {
      mejorDiferencia = diferencia;
      mejorTotalCentimos = totalCentimos;
      mejorIds = ids;
      if (diferencia === 0) break;
    }
  }

  // Ítem individual más cercano al objetivo — cubre el caso de pool pequeño donde todos los
  // pedidos superan el objetivo (ahí ningún barajado "sin pasarse" llegaría a nada mejor que 0).
  for (const item of items) {
    const diferencia = Math.abs(item.centimos - objetivoCentimos);
    if (diferencia < mejorDiferencia) {
      mejorDiferencia = diferencia;
      mejorTotalCentimos = item.centimos;
      mejorIds = [item.id];
    }
  }

  return {
    ventaIds: mejorIds,
    totalAlcanzado: new Decimal(mejorTotalCentimos).dividedBy(100),
    diferencia: new Decimal(mejorTotalCentimos).dividedBy(100).minus(importeObjetivo),
  };
}
