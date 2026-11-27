/**
 * Tests de los vídeos de un módulo (S23): cada vídeo se desbloquea al superar el test del anterior; verlo no
 * hace falta. El primero siempre está abierto y la ruta entre módulos sigue libre.
 * MVP: los tests superados se guardan en el navegador, igual que los vistos (ver `vistos.ts`).
 * Las preguntas son las del banco del módulo con `uso = video` (#3): ver `/api/modulos/:id/tests-videos`.
 */
import { type AlmacenVistos, leerVistos, marcarVisto } from "./vistos";

export function claveTests(cursoSlug: string, moduloSlug: string): string {
  return `480:tests:${cursoSlug}/${moduloSlug}`;
}

/** Ids de las clases con el test superado (vacío si no se puede leer). */
export function leerSuperados(almacen: AlmacenVistos | null, clave: string): Set<string> {
  return leerVistos(almacen, clave);
}

/** Guarda la clase como superada (un conjunto de ids, mismo formato que los vistos). */
export function superarTest(almacen: AlmacenVistos | null, clave: string, claseId: string): Set<string> {
  return marcarVisto(almacen, clave, claseId);
}

/**
 * Clases que se pueden abrir: la primera, y cada una cuyo vídeo anterior tiene el test superado o no tiene test
 * (`sinTest`: vídeos sin preguntas aprobadas, que no deben bloquear a nadie).
 */
export function desbloqueadas(
  clases: readonly { id: string }[],
  superados: ReadonlySet<string>,
  sinTest: ReadonlySet<string> = new Set(),
): Set<string> {
  return new Set(
    clases.filter((_, i) => i === 0 || superados.has(clases[i - 1].id) || sinTest.has(clases[i - 1].id)).map((c) => c.id),
  );
}

