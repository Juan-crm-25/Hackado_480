import { ruta } from "@/server/compartido/http";
import { esquemaParamsCurso, esquemaRuta } from "@/server/matriculas/esquemas";
import { guardarRuta, obtenerRuta } from "@/server/matriculas/servicio";

/** Ruta personal del alumno en un curso: los módulos en su orden. Solo si tiene el curso (403 si no). */
export const GET = ruta({ acceso: "usuario", params: esquemaParamsCurso }, ({ usuario, params }) =>
  obtenerRuta(usuario, params.slug),
);

/** Guarda la ruta a partir de las valoraciones de cada módulo y devuelve la recomendación del tutor. */
export const PUT = ruta({ acceso: "usuario", params: esquemaParamsCurso, cuerpo: esquemaRuta }, ({ usuario, params, cuerpo }) =>
  guardarRuta(usuario, params.slug, cuerpo),
);
