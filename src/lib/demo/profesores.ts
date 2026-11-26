/**
 * DATOS DE DEMOSTRACIÓN del MVP: ficha del profesor de cada curso, inventada (la BBDD solo guarda su
 * nombre y su email, sin bio). El nombre coincide con el del seed (Ana Torres, profesora@demo.test).
 * Ver AGENTS.md, «Data rules»: src/lib/demo/ es contenido de ejemplo fijo.
 */
export interface FichaProfesor {
  nombre: string;
  /** «Tu profesora» o «Tu profesor». */
  tratamiento: "Tu profesora" | "Tu profesor";
  /** A qué se dedica. */
  rol: string;
  bio: string;
  anosExperiencia: number;
  especialidades: string[];
  /** Tiempo de respuesta orientativo. */
  respuesta: string;
  /** Id de su conversación en la bandeja simulada (src/lib/demo/mensajes.ts). */
  conversacion: string;
}

/** Por slug del curso. */
const profesores: Record<string, FichaProfesor> = {
  "desarrollo-web": {
    nombre: "Ana Torres",
    tratamiento: "Tu profesora",
    rol: "Desarrolladora front-end y formadora",
    bio: "Lleva años construyendo webs accesibles para startups y medios. Le encanta explicar CSS y JavaScript con ejemplos del día a día.",
    anosExperiencia: 9,
    especialidades: ["HTML y CSS", "JavaScript", "Accesibilidad web"],
    respuesta: "Suele responder en menos de 24 h",
    conversacion: "ana-torres",
  },
};

/** Para los cursos sin ficha: un profesor genérico, para que la tarjeta nunca quede vacía. */
const generico: FichaProfesor = {
  nombre: "Equipo docente 480",
  tratamiento: "Tu profesor",
  rol: "Profesorado de 480 Academy",
  bio: "Profesionales en activo que acompañan el curso y resuelven tus dudas.",
  anosExperiencia: 5,
  especialidades: ["Acompañamiento", "Resolución de dudas"],
  respuesta: "Suele responder en menos de 48 h",
  conversacion: "equipo-docente",
};

export function profesorDelCurso(cursoSlug: string): FichaProfesor {
  return profesores[cursoSlug] ?? generico;
}
