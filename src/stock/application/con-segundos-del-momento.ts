// Sella los segundos y milisegundos REALES del momento de guardado sobre una fecha que el
// usuario solo puede elegir con precisión de minuto (input datetime-local). Así, varios
// movimientos registrados en el mismo minuto — típicamente varios seguidos con la fecha por
// defecto "ahora" — siguen ordenándose por el momento real en que se guardaron, sin que el
// usuario tenga que ver ni pueda tocar nunca los segundos.
export function conSegundosDelMomento(fecha: Date): Date {
  const ahora = new Date();
  const resultado = new Date(fecha);
  resultado.setSeconds(ahora.getSeconds(), ahora.getMilliseconds());
  return resultado;
}
