import "server-only";
import { getDb, type Db } from "@/lib/db/client";
import { aplicarOrden, ordenarRuta, type Valoracion } from "@/lib/ruta";
import type { UsuarioSesion } from "../auth/roles";
import { datosInvalidos, noEncontrado } from "../compartido/errores";
import {
  guardarRutaDeMatricula,
  leerMatriculaDelUsuario,
  leerModulosDelCurso,
  leerProgresoDelCurso,
} from "../matriculas/repositorio";
import { requerirAccesoCurso } from "../matriculas/servicio";
import {
  preguntasDiagnosticoPorDefecto,
  type PreguntaDiagnosticoInterna,
  type PreguntaDiagnosticoPublica,
} from "./banco-diagnostico";
import type { DatosResponderDiagnostico } from "./esquemas";
import {
  guardarIntentoDiagnostico,
  leerDiagnosticoEnBd,
  leerEstadoModulo,
  leerModuloConCurso,
  marcarModuloDominado,
} from "./repositorio";

export type DiagnosticoModulo = {
  modulo: { id: string; titulo: string };
  preguntas: PreguntaDiagnosticoPublica[];
};

export type ResultadoDiagnostico = {
  modulo: { id: string; titulo: string };
  aciertos: number;
  total: number;
  dominado: boolean;
  orden: string[];
  principal: string | null;
  mensaje: string;
};

async function cargarPreguntasInternas(
  moduloUuid: string,
  moduloSlug: string,
  db: Db,
): Promise<{ evaluacionId: string | null; preguntas: PreguntaDiagnosticoInterna[] }> {
  const enBd = await leerDiagnosticoEnBd(moduloUuid, db);
  if (enBd && enBd.preguntas.length > 0) {
    const preguntas: PreguntaDiagnosticoInterna[] = enBd.preguntas.map((p) => ({
      id: p.id,
      orden: p.orden,
      enunciado: p.enunciado,
      opciones: (p.opciones ?? []).map((o) => o.texto),
      correcta: typeof p.solucion === "number" ? p.solucion : 0,
    }));
    return { evaluacionId: enBd.evaluacionId, preguntas };
  }
  return { evaluacionId: null, preguntas: preguntasDiagnosticoPorDefecto(moduloSlug) };
}

/** Devuelve las ~3 preguntas del diagnóstico rápido de un módulo (sin la respuesta correcta). */
export async function obtenerDiagnosticoModulo(
  usuario: UsuarioSesion,
  moduloSlug: string,
  db: Db = getDb(),
): Promise<DiagnosticoModulo> {
  const info = await leerModuloConCurso(moduloSlug, db);
  if (!info) throw noEncontrado("No encontramos ese módulo");

  await requerirAccesoCurso(usuario, info.cursoSlug, db);

  const { preguntas } = await cargarPreguntasInternas(info.moduloId, info.moduloSlug, db);
  if (preguntas.length === 0) throw noEncontrado("Este módulo aún no tiene diagnóstico disponible");

  return {
    modulo: { id: info.moduloSlug, titulo: info.moduloTitulo },
    preguntas: preguntas.map(({ id, orden, enunciado, opciones }) => ({ id, orden, enunciado, opciones })),
  };
}

/**
 * Corrige el diagnóstico rápido del módulo. Si el alumno acierta todas las preguntas:
 * 1) marca el módulo como `dominado` (sin darlo por completado, que exige los ejercicios del módulo), y
 * 2) baja el módulo al final de la ruta sugerida en `matricula.orden_modulos`.
 */
export async function responderDiagnosticoModulo(
  usuario: UsuarioSesion,
  moduloSlug: string,
  datos: DatosResponderDiagnostico,
  db: Db = getDb(),
): Promise<ResultadoDiagnostico> {
  const info = await leerModuloConCurso(moduloSlug, db);
  if (!info) throw noEncontrado("No encontramos ese módulo");

  await requerirAccesoCurso(usuario, info.cursoSlug, db);

  const { evaluacionId, preguntas } = await cargarPreguntasInternas(info.moduloId, info.moduloSlug, db);
  if (preguntas.length === 0) throw noEncontrado("Este módulo aún no tiene diagnóstico disponible");

  let aciertos = 0;
  for (const p of preguntas) {
    if (!Object.hasOwn(datos.respuestas, p.id)) {
      throw datosInvalidos(undefined, "Faltan preguntas por responder en el diagnóstico");
    }
    if (datos.respuestas[p.id] === p.correcta) {
      aciertos += 1;
    }
  }

  const total = preguntas.length;
  const dominado = aciertos === total;

  if (evaluacionId) {
    await guardarIntentoDiagnostico(
      {
        usuarioId: usuario.id,
        evaluacionId,
        respuestas: datos.respuestas,
        nota: Number(((aciertos / total) * 10).toFixed(2)),
        aprobado: dominado,
      },
      db,
    );
  }

  const [matricula, modulosCurso, progresosCurso] = await Promise.all([
    leerMatriculaDelUsuario(usuario.id, info.cursoId, db),
    leerModulosDelCurso(info.cursoId, db),
    leerProgresoDelCurso(usuario.id, info.cursoId, db),
  ]);

  const slugDeUuid = new Map(modulosCurso.map((m) => [m.uuid, m.id]));
  const ordenPrevioSlugs = (matricula?.ordenModulos ?? [])
    .map((uuid) => slugDeUuid.get(uuid))
    .filter((s): s is string => !!s);

  const modulosBase =
    ordenPrevioSlugs.length > 0
      ? aplicarOrden(modulosCurso, ordenPrevioSlugs).map((m, idx) => ({ ...m, ordenSugerido: idx }))
      : modulosCurso;

  if (!dominado) {
    return {
      modulo: { id: info.moduloSlug, titulo: info.moduloTitulo },
      aciertos,
      total,
      dominado: false,
      orden: modulosBase.map((m) => m.id),
      principal: (matricula?.moduloPrincipalId && slugDeUuid.get(matricula.moduloPrincipalId)) ?? modulosBase[0]?.id ?? null,
      mensaje: `Has acertado ${aciertos} de ${total}. Te recomendamos repasar este módulo en tu ruta.`,
    };
  }

  const estadoActual = await leerEstadoModulo(usuario.id, info.moduloId, db);
  if (estadoActual !== "completado") {
    await marcarModuloDominado(usuario.id, info.moduloId, db);
  }

  const valoraciones: Partial<Record<string, Valoracion>> = { [info.moduloSlug]: "sabe" };
  for (const p of progresosCurso) {
    if (p.estado === "dominado" || p.estado === "completado") {
      valoraciones[p.moduloId] = "sabe";
    }
  }

  const { orden, principal } = ordenarRuta(modulosBase, valoraciones);

  if (matricula) {
    await guardarRutaDeMatricula(
      {
        matriculaId: matricula.id,
        orden: orden.map((m) => m.uuid),
        principalId: principal?.uuid ?? null,
      },
      db,
    );
  }

  return {
    modulo: { id: info.moduloSlug, titulo: info.moduloTitulo },
    aciertos,
    total,
    dominado: true,
    orden: orden.map((m) => m.id),
    principal: principal?.id ?? null,
    mensaje: `¡Módulo «${info.moduloTitulo}» marcado como dominado! Lo hemos bajado al final de tu ruta sugerida.`,
  };
}