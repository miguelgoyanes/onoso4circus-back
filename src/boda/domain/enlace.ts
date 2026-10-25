import { randomBytes } from 'crypto';

// 128 bits aleatorios en base64url (22 caracteres): no es secuencial ni adivinable.
export function generarToken(): string {
  return randomBytes(16).toString('base64url');
}

export function normalizarTelefono(
  telefono: string | null | undefined,
): string | null {
  if (!telefono) return null;
  let digitos = telefono.replace(/\D/g, '');
  if (digitos.startsWith('00')) digitos = digitos.slice(2);
  // Móvil/fijo español sin prefijo: se asume +34.
  if (/^[6789]\d{8}$/.test(digitos)) digitos = `34${digitos}`;
  return digitos.length >= 8 ? digitos : null;
}

export function construirEnlace(urlBase: string, token: string): string {
  return `${urlBase.replace(/\/+$/, '')}/i/${token}`;
}

export function construirMensaje(
  plantilla: string,
  nombre: string,
  enlace: string,
): string {
  return plantilla
    .split('{nombre}')
    .join(nombre)
    .split('{enlace}')
    .join(enlace);
}

export function construirUrlWhatsapp(
  telefono: string | null,
  mensaje: string,
): string | null {
  const normalizado = normalizarTelefono(telefono);
  return normalizado
    ? `https://wa.me/${normalizado}?text=${encodeURIComponent(mensaje)}`
    : null;
}

// "Ana", "Ana y Luis", "Ana, Luis y Marta".
export function unirNombres(nombres: readonly string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? '';
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

// Cómo se nombra la invitación: el tratamiento si lo hay ("la familia Goyanes"); si no, los nombres
// conocidos y, si queda alguna plaza sin nombre, "y compañía" ("Ana, Luis y compañía").
export function nombrarInvitacion(
  tratamiento: string | null,
  nombres: readonly string[],
): string {
  if (tratamiento?.trim()) return tratamiento.trim();
  const conocidos = nombres.filter((n) => n.trim().length > 0);
  return unirNombres(
    conocidos.length < nombres.length ? [...conocidos, 'compañía'] : conocidos,
  );
}
