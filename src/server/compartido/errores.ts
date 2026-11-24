import "server-only";

/** Código HTTP de cada error de la aplicación (docs/arquitectura.md, sección 3). */
export const STATUS_POR_CODIGO = {
  NO_AUTENTICADO: 401,
  PROHIBIDO: 403,
  NO_ENCONTRADO: 404,
  DATOS_INVALIDOS: 400,
  CONFLICTO: 409,
  LIMITE_SUPERADO: 429,
  ERROR_IA: 502,
} as const;

export type CodigoError = keyof typeof STATUS_POR_CODIGO;

/** Error esperado de la aplicación. `ruta()` lo traduce a su código HTTP y a `{ error, codigo, detalles? }`. */
export class ErrorApp extends Error {
  readonly codigo: CodigoError;
  readonly detalles?: unknown;

  constructor(codigo: CodigoError, mensaje: string, detalles?: unknown) {
    super(mensaje);
    this.name = "ErrorApp";
    this.codigo = codigo;
    this.detalles = detalles;
  }

  get status(): number {
    return STATUS_POR_CODIGO[this.codigo];
  }
}

export const noAutenticado = (mensaje = "Necesitas iniciar sesión") => new ErrorApp("NO_AUTENTICADO", mensaje);

export const prohibido = (mensaje = "No tienes permiso para hacer esto") => new ErrorApp("PROHIBIDO", mensaje);

export const noEncontrado = (mensaje = "No encontrado") => new ErrorApp("NO_ENCONTRADO", mensaje);

export const datosInvalidos = (detalles?: unknown, mensaje = "Datos no válidos") =>
  new ErrorApp("DATOS_INVALIDOS", mensaje, detalles);

export const conflicto = (mensaje = "Ya existe") => new ErrorApp("CONFLICTO", mensaje);

export const limiteSuperado = (mensaje = "Has alcanzado el límite diario") => new ErrorApp("LIMITE_SUPERADO", mensaje);

export const errorIa = (mensaje = "La IA no ha podido responder. Inténtalo de nuevo") => new ErrorApp("ERROR_IA", mensaje);
