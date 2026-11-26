import { ruta } from "@/server/compartido/http";
import { esquemaPasarATutorHumano, esquemaQueryMisDudas } from "@/server/tutor/esquemas";
import { listarMisDudasHumanas, pasarATutorHumano } from "@/server/tutor/servicio";

/**
 * Tutor humano (H9), lado del alumno:
 * - POST: pasa una pregunta SUYA (preguntaId de POST /api/tutor) al profesor del curso. Ajena o inexistente: 404.
 * - GET ?modulo=<slug>: sus dudas pasadas en ese módulo, con la respuesta del profesor cuando la hay.
 */
export const POST = ruta({ acceso: "usuario", cuerpo: esquemaPasarATutorHumano }, ({ usuario, cuerpo }) =>
  pasarATutorHumano(usuario, cuerpo.preguntaId),
);

export const GET = ruta({ acceso: "usuario", query: esquemaQueryMisDudas }, ({ usuario, query }) => listarMisDudasHumanas(usuario, query.modulo));
