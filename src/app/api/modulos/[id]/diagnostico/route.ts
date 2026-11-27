import { ruta } from "@/server/compartido/http";
import { esquemaParamsModulo, esquemaResponderDiagnostico } from "@/server/evaluaciones/esquemas";
import { obtenerDiagnosticoModulo, responderDiagnosticoModulo } from "@/server/evaluaciones/servicio";

/** Preguntas del diagnóstico rápido de un módulo. Exige tener el curso (403 si no). */
export const GET = ruta({ acceso: "usuario", params: esquemaParamsModulo }, ({ usuario, params }) =>
  obtenerDiagnosticoModulo(usuario, params.id),
);

/** Corrige el diagnóstico rápido del módulo; si acierta todas, lo marca dominado y lo baja en la ruta. */
export const POST = ruta(
  { acceso: "usuario", params: esquemaParamsModulo, cuerpo: esquemaResponderDiagnostico },
  ({ usuario, params, cuerpo }) => responderDiagnosticoModulo(usuario, params.id, cuerpo),
);