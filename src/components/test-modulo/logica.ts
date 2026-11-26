/** Lógica de la pantalla del test del módulo (#3), sin React: qué se ha respondido, qué se envía y qué se dice. */
import type { EjercicioPublico, PeticionTestModulo, ResultadoTestModulo, TestModulo } from "@/lib/types";

/** Respuesta de cada pregunta por su id: el índice de la opción (test) o el texto escrito. */
export type Respuestas = Record<string, string | number>;

const respondida = (r: string | number | undefined) => (typeof r === "number" ? true : Boolean(r?.trim()));

/** Cuántas preguntas del test tienen respuesta (un texto solo con espacios no cuenta). */
export function cuantasRespondidas(preguntas: EjercicioPublico[], respuestas: Respuestas): number {
  return preguntas.filter((p) => respondida(respuestas[p.id])).length;
}

/** Lo que se manda al entregar: la firma del test y una respuesta por pregunta, en su orden. */
export function peticionEntrega(test: TestModulo, respuestas: Respuestas): PeticionTestModulo {
  return {
    firma: test.firma,
    respuestas: test.preguntas.map((p) => {
      const r = respuestas[p.id];
      return { ejercicioId: p.id, respuesta: typeof r === "number" ? r : (r ?? "").trim() };
    }),
  };
}

/** La respuesta del alumno para enseñarla en la corrección. */
export function textoDeRespuesta(pregunta: EjercicioPublico, respuesta: string | number | undefined): string {
  if (!respondida(respuesta)) return "Sin responder";
  if (pregunta.tipo === "test") return pregunta.opciones?.[Number(respuesta)] ?? "Sin responder";
  return String(respuesta).trim();
}

const NOTA = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });
/** 8.57 → "8,57"; 10 → "10". */
export const textoNota = (nota: number) => NOTA.format(nota);

/** La frase bajo la nota. */
export function mensajeResultado(r: ResultadoTestModulo): string {
  if (r.aprobado) return "¡Aprobado! Has completado el módulo.";
  if (r.estado === "completado") {
    return `Esta vez no llegas al ${r.notaAprobado}, pero el módulo sigue completado: cuenta tu mejor nota, un ${textoNota(r.mejorNota)}.`;
  }
  return `Necesitas un ${r.notaAprobado} para completar el módulo. Repasa los momentos de los vídeos que te indicamos y vuelve a intentarlo.`;
}
