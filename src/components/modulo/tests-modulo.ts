/**
 * Tests de los vídeos de un módulo (S23): cada vídeo se desbloquea al superar el test del anterior; verlo no
 * hace falta. El primero siempre está abierto y la ruta entre módulos sigue libre.
 * MVP: los tests superados se guardan en el navegador, igual que los vistos (ver `vistos.ts`).
 * Test de demostración · el test definitivo llega con la issue #3.
 */
import type { PreguntaDemo } from "./tests-demo";
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

/** Clases que se pueden abrir: la primera, y cada una cuyo vídeo anterior tiene el test superado. */
export function desbloqueadas(clases: readonly { id: string }[], superados: ReadonlySet<string>): Set<string> {
  return new Set(clases.filter((_, i) => i === 0 || superados.has(clases[i - 1].id)).map((c) => c.id));
}

export function esCorrecta(pregunta: PreguntaDemo, opcion: number | null): boolean {
  return opcion === pregunta.correcta;
}
