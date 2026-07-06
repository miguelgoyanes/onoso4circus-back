// Solo minúsculas, números y guiones (ej. "juan-malabarista") — nada de
// mayúsculas, espacios ni símbolos, para que sea fácil de teclear y de
// recordar para el personal del circo.
export const USERNAME_REGEX = /^[a-z0-9-]+$/;
export const USERNAME_REGEX_MESSAGE =
  'El usuario solo puede contener minúsculas, números y guiones';
