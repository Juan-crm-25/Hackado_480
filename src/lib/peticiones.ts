/** Ayudas para las llamadas a la API desde el navegador. Sin dependencias de servidor. */

const SIN_CONEXION = "Sin conexión. Inténtalo de nuevo.";

/** Texto para el alumno a partir de un error capturado ("Failed to fetch" es el fallo de red del navegador). */
export function mensajeDeError(e: unknown): string {
  return e instanceof Error && e.message !== "Failed to fetch" ? e.message : SIN_CONEXION;
}

/** Lee el JSON de una respuesta de la API. Si la API devuelve `{ error }` o falla, lanza un Error con su mensaje. */
export async function leerRespuesta<T>(res: Response): Promise<T> {
  const datos: unknown = await res.json().catch(() => null);
  if (datos && typeof datos === "object" && "error" in datos && typeof datos.error === "string") {
    throw new Error(datos.error);
  }
  if (!res.ok || datos === null) throw new Error("Error inesperado");
  return datos as T;
}
