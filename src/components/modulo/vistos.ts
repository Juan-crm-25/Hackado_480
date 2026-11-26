/**
 * Vídeos «vistos» de un módulo: los ids de las clases que el alumno ha abierto.
 * MVP: se guardan en el navegador (localStorage), así que son por navegador y dispositivo, no por cuenta;
 * guardarlo en la BBDD sería otra tabla y otra migración (decisión en odd/tasks/foro.md, L10).
 * Todo va en try/catch: en modo privado o con el almacenamiento bloqueado, simplemente no hay nada visto.
 */

/** Lo que se usa de `Storage`: así los tests pasan un objeto en memoria, sin DOM. */
export type AlmacenVistos = Pick<Storage, "getItem" | "setItem">;

export function claveVistos(cursoSlug: string, moduloSlug: string): string {
  return `480:vistos:${cursoSlug}/${moduloSlug}`;
}

/** Texto guardado tal cual (null si no hay o no se puede leer). Es estable entre lecturas: sirve de instantánea. */
export function leerTextoVistos(almacen: AlmacenVistos | null, clave: string): string | null {
  try {
    return almacen?.getItem(clave) ?? null;
  } catch {
    return null;
  }
}

/** Ids a partir del texto guardado: un array JSON de textos; lo demás se ignora. */
export function vistosDeTexto(texto: string | null): Set<string> {
  if (!texto) return new Set();
  try {
    const valor: unknown = JSON.parse(texto);
    return Array.isArray(valor) ? new Set(valor.filter((v): v is string => typeof v === "string")) : new Set();
  } catch {
    return new Set();
  }
}

export function leerVistos(almacen: AlmacenVistos | null, clave: string): Set<string> {
  return vistosDeTexto(leerTextoVistos(almacen, clave));
}

export function guardarVistos(almacen: AlmacenVistos | null, clave: string, vistos: Set<string>): void {
  try {
    almacen?.setItem(clave, JSON.stringify([...vistos]));
  } catch {
    // Sin almacenamiento (lleno, bloqueado): el «visto» no se recuerda, pero la pantalla sigue funcionando.
  }
}

/** Añade la clase a las vistas, lo guarda y devuelve el conjunto nuevo. */
export function marcarVisto(almacen: AlmacenVistos | null, clave: string, claseId: string): Set<string> {
  const vistos = leerVistos(almacen, clave);
  vistos.add(claseId);
  guardarVistos(almacen, clave, vistos);
  return vistos;
}
