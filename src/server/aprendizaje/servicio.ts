import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { corregir as corregirConAgente, necesitaIA } from "@/lib/agentes/corrector";
import { consultasRestantes, descontarConsultas } from "@/lib/ai/limite";
import { getModulo } from "@/lib/catalogo";
import { getDb, type Db } from "@/lib/db/client";
import { NOTA_APROBADO, calcularNota, elegirPreguntas } from "@/lib/test-modulo";
import type { EjercicioPublico, ResultadoPregunta, ResultadoTestModulo, ResultadoTestVideo, TestModulo, TestsVideos } from "@/lib/types";
import { CURSO_DEMO_SLUG } from "@/lib/usuario-demo";
import type { UsuarioSesion } from "../auth/roles";
import { datosInvalidos, limiteSuperado, noEncontrado } from "../compartido/errores";
import { buscarModulo } from "../matriculas/demo";
import { requerirAccesoCurso } from "../matriculas/servicio";
import type { DatosEntregaTestModulo, DatosTestVideo } from "./esquemas";
import { guardarTestModulo, guardarTestVideo, leerBancoAprobado, type PreguntaDelBanco, type TestCorregido } from "./repositorio";

/** El módulo de la demo por su slug, con su id en la BBDD, si el usuario tiene el curso (403 si no; 404 si no existe). */
async function moduloConAcceso(usuario: UsuarioSesion, moduloSlug: string, db: Db) {
  const modulo = getModulo(moduloSlug);
  if (!modulo) throw noEncontrado(`No existe el módulo "${moduloSlug}"`);
  await requerirAccesoCurso(usuario, CURSO_DEMO_SLUG, db);
  const moduloBd = await buscarModulo(modulo.id, db);
  if (!moduloBd) throw noEncontrado(`El módulo "${modulo.id}" no está en la base de datos`);
  return { slug: modulo.id, id: moduloBd.id };
}

/**
 * Firma de las preguntas que le han salido a un alumno en un módulo: así, al entregar, solo valen ESAS preguntas
 * (no puede elegir las que quiera ni reutilizar el test de otro). No guarda nada: se recalcula al entregar.
 */
function firmar(usuarioId: string, moduloSlug: string, ejercicioIds: string[]): string {
  const secreto = process.env.BETTER_AUTH_SECRET || process.env.AI_SEUDONIMO_SAL || "secreto-solo-para-desarrollo";
  return createHmac("sha256", secreto)
    .update(`test-modulo|${usuarioId}|${moduloSlug}|${[...ejercicioIds].sort().join(",")}`)
    .digest("base64url");
}

function firmaValida(firma: string, esperada: string): boolean {
  const [a, b] = [Buffer.from(firma), Buffer.from(esperada)];
  return a.length === b.length && timingSafeEqual(a, b);
}

const publica = (moduloSlug: string, p: PreguntaDelBanco): EjercicioPublico => ({
  id: p.id,
  moduloId: moduloSlug,
  conceptoId: p.conceptoId,
  tipo: p.tipo,
  enunciado: p.enunciado,
  ...(p.opciones ? { opciones: p.opciones } : {}),
  referencia: p.referencia,
});

/**
 * GET /api/modulos/:id/test (#3): entre 5 y 8 preguntas al azar del banco del módulo (aprobadas, `uso = modulo`),
 * sin solución ni rúbrica, y la firma para entregarlo. Necesita el curso (403). Sin banco: 404.
 * Si no le quedan consultas de IA para corregir sus preguntas abiertas o de código, no se abre (429) y no gasta nada.
 */
export async function empezarTestModulo(
  usuario: UsuarioSesion,
  moduloSlug: string,
  db: Db = getDb(),
  deps: { azar?: () => number } = {},
): Promise<TestModulo> {
  const modulo = await moduloConAcceso(usuario, moduloSlug, db);
  const preguntas = elegirPreguntas(await leerBancoAprobado(modulo.id, "modulo", db), deps.azar);
  if (preguntas.length === 0) throw noEncontrado("Este módulo todavía no tiene test");

  const necesarias = preguntas.filter((p) => necesitaIA(p.tipo)).length;
  if (necesarias > 0) {
    const quedan = await consultasRestantes(usuario.id, db);
    if (quedan < necesarias) {
      throw limiteSuperado(
        `Hoy no te quedan consultas suficientes para este test: necesita ${necesarias} y te ${quedan === 1 ? "queda" : "quedan"} ${quedan}. Vuelve mañana.`,
      );
    }
  }

  return {
    moduloId: modulo.slug,
    preguntas: preguntas.map((p) => publica(modulo.slug, p)),
    firma: firmar(usuario.id, modulo.slug, preguntas.map((p) => p.id)),
    notaAprobado: NOTA_APROBADO,
  };
}

/**
 * POST /api/modulos/:id/test (#3): corrige el test que se le dio (lo comprueba con la firma: 400 si no coincide),
 * descuenta una consulta por cada respuesta corregida con IA (aunque pase del límite: se comprobó al empezar), guarda
 * cada respuesta, el test entero y el progreso, y devuelve la nota y la corrección de cada pregunta.
 */
export async function entregarTestModulo(
  usuario: UsuarioSesion,
  moduloSlug: string,
  entrega: DatosEntregaTestModulo,
  db: Db = getDb(),
  deps: { corregir?: typeof corregirConAgente } = {},
): Promise<ResultadoTestModulo> {
  const corregir = deps.corregir ?? corregirConAgente;
  const modulo = await moduloConAcceso(usuario, moduloSlug, db);

  const ids = entrega.respuestas.map((r) => r.ejercicioId);
  const noEsElTest = datosInvalidos(undefined, "Estas respuestas no son del test que se te dio. Vuelve a empezar el test.");
  if (new Set(ids).size !== ids.length || !firmaValida(entrega.firma, firmar(usuario.id, modulo.slug, ids))) throw noEsElTest;
  const banco = new Map((await leerBancoAprobado(modulo.id, "modulo", db)).map((p) => [p.id, p]));
  const preguntas = ids.map((id) => banco.get(id));
  if (preguntas.some((p) => !p)) throw noEsElTest;

  const resultados = await Promise.all(
    entrega.respuestas.map(async ({ respuesta }, i) => {
      const pregunta = preguntas[i] as PreguntaDelBanco;
      return { pregunta, respuesta, correccion: await corregir(pregunta, respuesta, { nombresOcultos: [usuario.nombre] }) };
    }),
  );
  const conIA = resultados.filter((r) => necesitaIA(r.pregunta.tipo) && String(r.respuesta).trim()).length;
  await descontarConsultas(usuario.id, conIA, db);

  const nota = calcularNota(resultados.map((r) => r.correccion.puntuacion));
  const aprobado = nota >= NOTA_APROBADO;
  const { mejorNota, estado } = await guardarTestModulo({ usuarioId: usuario.id, moduloId: modulo.id, nota, aprobado, resultados }, db);

  return {
    nota,
    aprobado,
    notaAprobado: NOTA_APROBADO,
    mejorNota,
    estado,
    resultados: resultados.map(aResultado),
  };
}

const aResultado = ({ pregunta, correccion }: TestCorregido["resultados"][number]): ResultadoPregunta => ({
  ejercicioId: pregunta.id,
  correcto: correccion.correcto,
  puntuacion: correccion.puntuacion,
  feedback: correccion.feedback,
  ...(correccion.repasar ? { repasar: correccion.repasar } : {}),
  revisionHumana: correccion.revisionHumana,
});

// ─── Test de cada vídeo (#3): 2 preguntas fáciles que desbloquean el siguiente vídeo ──────────────────────────

/**
 * GET /api/modulos/:id/tests-videos: las preguntas aprobadas de vídeo (`uso = video`) del módulo, sin solución,
 * agrupadas por el vídeo. Siempre las mismas (es un pequeño trámite). Necesita el curso (403); módulo que no existe: 404.
 */
export async function testsDeLosVideos(usuario: UsuarioSesion, moduloSlug: string, db: Db = getDb()): Promise<TestsVideos> {
  const modulo = await moduloConAcceso(usuario, moduloSlug, db);
  const porVideo: Record<string, EjercicioPublico[]> = {};
  // En el orden en que se explican en el vídeo.
  const banco = (await leerBancoAprobado(modulo.id, "video", db)).sort((a, b) => a.referencia.segundo - b.referencia.segundo);
  for (const p of banco) {
    (porVideo[p.referencia.videoId] ??= []).push(publica(modulo.slug, p));
  }
  return { moduloId: modulo.slug, porVideo };
}

/**
 * POST /api/modulos/:id/tests-videos: corrige las respuestas a TODAS las preguntas de un vídeo (400 si falta alguna, se
 * repite o es de otro vídeo). Superado si están todas bien. Guarda cada respuesta en `intento`. No usa la IA: el test
 * de vídeo solo tiene preguntas de test y respuesta corta.
 */
export async function comprobarTestVideo(
  usuario: UsuarioSesion,
  moduloSlug: string,
  peticion: DatosTestVideo,
  db: Db = getDb(),
  deps: { corregir?: typeof corregirConAgente } = {},
): Promise<ResultadoTestVideo> {
  const corregir = deps.corregir ?? corregirConAgente;
  const modulo = await moduloConAcceso(usuario, moduloSlug, db);
  const delVideo = (await leerBancoAprobado(modulo.id, "video", db)).filter((p) => p.referencia.videoId === peticion.videoId);

  const ids = peticion.respuestas.map((r) => r.ejercicioId);
  const mismas = ids.length === delVideo.length && new Set(ids).size === ids.length && delVideo.every((p) => ids.includes(p.id));
  if (delVideo.length === 0 || !mismas) {
    throw datosInvalidos(undefined, "Responde todas las preguntas del test de este vídeo.");
  }

  const porId = new Map(delVideo.map((p) => [p.id, p]));
  const resultados = await Promise.all(
    peticion.respuestas.map(async ({ ejercicioId, respuesta }) => {
      const pregunta = porId.get(ejercicioId) as PreguntaDelBanco;
      return { pregunta, respuesta, correccion: await corregir(pregunta, respuesta, { nombresOcultos: [usuario.nombre] }) };
    }),
  );
  await guardarTestVideo(usuario.id, modulo.id, resultados, db);
  return { superado: resultados.every((r) => r.correccion.correcto), resultados: resultados.map(aResultado) };
}
