import { ruta } from "@/server/compartido/http";
import { esquemaParamsId, esquemaValidacionProfesor } from "@/server/foro/esquemas";
import { validarComoProfesor } from "@/server/foro/servicio";

/** El profesor del curso (o un admin) valora un comentario de un alumno: { validacion }. Prevalece sobre la IA. */
export const PUT = ruta({ acceso: "usuario", params: esquemaParamsId, cuerpo: esquemaValidacionProfesor }, ({ usuario, params, cuerpo }) =>
  validarComoProfesor(usuario, params.id, cuerpo.validacion),
);
