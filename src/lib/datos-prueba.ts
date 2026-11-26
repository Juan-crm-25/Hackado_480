/**
 * DATOS DE PRUEBA para que la API responda mientras no existan la BBDD (#13),
 * el banco de ejercicios (#4) ni los agentes (#1, #5).
 * Cada bloque los sustituye por la implementación real sin cambiar los tipos.
 */
import type { Alumno, Ejercicio, Progreso } from "./types";

export const alumnosDemo: Alumno[] = [
  { id: "a1", nombre: "Lucía Martín", email: "lucia@demo.test", esMenor: false, consentimientoTutorLegal: false },
  { id: "a2", nombre: "Pablo Ruiz", email: "pablo@demo.test", esMenor: true, consentimientoTutorLegal: true },
];

export const ejerciciosDemo: Ejercicio[] = [
  {
    id: "e-m2-1",
    moduloId: "m2-css",
    conceptoId: "css-especificidad",
    tipo: "test",
    enunciado: "¿Qué selector tiene más especificidad?",
    opciones: [".boton", "#enviar", "button", "div button"],
    solucion: 1,
    referencia: { videoId: "v04", segundo: 0 },
    estado: "aprobado",
  },
  {
    id: "e-m2-2",
    moduloId: "m2-css",
    conceptoId: "css-caja",
    tipo: "abierta",
    enunciado: "Explica con tus palabras la diferencia entre margin y padding.",
    rubrica: "Menciona que padding es espacio interior (dentro del borde) y margin espacio exterior (fuera del borde).",
    referencia: { videoId: "v05", segundo: 0 },
    estado: "aprobado",
  },
];

export const progresoDemo: Progreso[] = [
  {
    alumnoId: "a1",
    moduloId: "m1-html",
    estado: "dominado",
    aciertosPorConcepto: { "html-web": 1, "html-estructura": 1, "html-semantica": 0.8 },
    actualizado: "2026-11-23T10:00:00Z",
  },
  {
    alumnoId: "a1",
    moduloId: "m2-css",
    estado: "en_curso",
    aciertosPorConcepto: { "css-especificidad": 0.3 },
    actualizado: "2026-11-23T11:00:00Z",
  },
];

