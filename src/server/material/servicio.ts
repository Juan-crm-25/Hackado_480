import "server-only";
import { ErrorIA } from "@/lib/ai/cliente";
import { consumirConsulta } from "@/lib/ai/limite";
import { ErrorMaterial, generarMaterialPersonal } from "@/lib/agentes/material-personal";
import { getModulo } from "@/lib/catalogo";
import { getDb, type Db } from "@/lib/db/client";
import type { Infografia, MaterialPersonal, RespuestaMaterialPersonal, SeccionResumen, Tarjeta } from "@/lib/types";
import { CURSO_DEMO_SLUG } from "@/lib/usuario-demo";
import type { UsuarioSesion } from "../auth/roles";
import { datosInvalidos, errorIa, limiteSuperado, noEncontrado } from "../compartido/errores";
import { buscarConcepto, buscarModulo } from "../matriculas/demo";
import { requerirAccesoCurso } from "../matriculas/servicio";
import type { DatosPeticionMaterialPersonal } from "./esquemas";
import { guardarMaterialPersonal, leerMaterialPublicado, listarMaterialPersonal } from "./repositorio";

export interface DependenciasMaterialPersonal {
  generar: typeof generarMaterialPersonal;
}

/**
 * POST /api/material-personal (#2): el usuario de la SESIÓN se crea un resumen o unas tarjetas de un módulo.
 * Necesita el curso (matrícula, profesor del curso o admin) y cuenta para SU límite diario.
 * Si no se puede generar con esas indicaciones: 400 (el mensaje se puede enseñar tal cual). Si falla la IA: 502.
 */
export async function crearMaterialPersonal(
  usuario: UsuarioSesion,
  peticion: DatosPeticionMaterialPersonal,
  db: Db = getDb(),
  deps: DependenciasMaterialPersonal = { generar: generarMaterialPersonal },
): Promise<RespuestaMaterialPersonal> {
  const modulo = getModulo(peticion.moduloId);
  if (!modulo) throw noEncontrado(`No existe el módulo "${peticion.moduloId}"`);
  await requerirAccesoCurso(usuario, CURSO_DEMO_SLUG, db);

  // Filas de la BBDD antes de gastar una consulta: sin ellas no se podría guardar el material.
  const moduloBd = await buscarModulo(modulo.id, db);
  if (!moduloBd) throw noEncontrado(`El módulo "${modulo.id}" no está en la base de datos`);
  // Un concepto que no es de este módulo lo rechaza el generador.
  let conceptoBdId: string | null = null;
  if (peticion.conceptoId && modulo.conceptos.some((c) => c.id === peticion.conceptoId)) {
    conceptoBdId = (await buscarConcepto(moduloBd.id, peticion.conceptoId, db))?.id ?? null;
  }
  if (!modulo.videos.some((v) => v.transcripcion)) {
    throw datosInvalidos(undefined, `Todavía no tengo el contenido de los vídeos del módulo «${modulo.titulo}».`);
  }

  const limite = await consumirConsulta(usuario.id, db);
  if (!limite.permitido) throw limiteSuperado("Has llegado al límite de consultas de hoy. Mañana podrás crear más material.");

  let material: MaterialPersonal;
  try {
    material = await deps.generar({ modulo, peticion: { ...peticion, alumnoId: usuario.id }, nombresOcultos: [usuario.nombre] });
  } catch (e) {
    if (e instanceof ErrorMaterial) throw datosInvalidos(undefined, e.message);
    console.error(`[material-personal] ${e instanceof ErrorIA ? e.message : "error inesperado"}`);
    throw errorIa("No se ha podido crear el material ahora mismo. Inténtalo de nuevo en unos segundos.");
  }

  await guardarMaterialPersonal(material, { usuarioId: usuario.id, moduloId: moduloBd.id, conceptoId: conceptoBdId }, db);
  return { material, consultasRestantes: limite.restantes };
}

/** GET /api/material-personal: el material del usuario de la SESIÓN, del más reciente al más antiguo. */
export async function listarMiMaterialPersonal(usuario: UsuarioSesion, moduloSlug?: string, db: Db = getDb()): Promise<MaterialPersonal[]> {
  let moduloId: string | undefined;
  if (moduloSlug) {
    const modulo = await buscarModulo(moduloSlug, db);
    if (!modulo) return [];
    moduloId = modulo.id;
  }
  return listarMaterialPersonal({ usuarioId: usuario.id, alumnoId: usuario.id, moduloId }, db);
}

// ── Material común del módulo (#15): lo revisado de sus vídeos, igual para todos los alumnos del curso ──

/** Material común de un módulo (por su slug): el revisado de sus vídeos, juntado en orden. */
export interface MaterialDelModulo {
  moduloId: string;
  resumen: SeccionResumen[];
  tarjetas: Tarjeta[];
  infografias: Infografia[];
}

/**
 * Pantalla de material: lo revisado del módulo para el usuario de la SESIÓN. Necesita el curso (matrícula, profesor
 * del curso o admin): 403 si no. Módulo que no existe: 404. Sin nada revisado, listas vacías. No llama a la IA.
 */
export async function leerMaterialDelModulo(usuario: UsuarioSesion, moduloSlug: string, db: Db = getDb()): Promise<MaterialDelModulo> {
  const modulo = getModulo(moduloSlug);
  if (!modulo) throw noEncontrado(`No existe el módulo "${moduloSlug}"`);
  await requerirAccesoCurso(usuario, CURSO_DEMO_SLUG, db);
  const moduloBd = await buscarModulo(modulo.id, db);
  if (!moduloBd) throw noEncontrado(`El módulo "${modulo.id}" no está en la base de datos`);
  return { moduloId: modulo.id, ...(await leerMaterialPublicado(moduloBd.id, db)) };
}

/** GET /api/modulos/:id/material: el resumen y las tarjetas revisados; 404 si aún no hay nada revisado. */
export async function materialComunDelModulo(
  usuario: UsuarioSesion,
  moduloSlug: string,
  db: Db = getDb(),
): Promise<Pick<MaterialDelModulo, "moduloId" | "resumen" | "tarjetas">> {
  const { moduloId, resumen, tarjetas } = await leerMaterialDelModulo(usuario, moduloSlug, db);
  if (!resumen.length && !tarjetas.length) throw noEncontrado("Este módulo todavía no tiene material de repaso");
  return { moduloId, resumen, tarjetas };
}

/** GET /api/modulos/:id/infografias: las infografías revisadas; 404 si aún no hay ninguna. */
export async function infografiasDelModulo(
  usuario: UsuarioSesion,
  moduloSlug: string,
  db: Db = getDb(),
): Promise<Pick<MaterialDelModulo, "moduloId" | "infografias">> {
  const { moduloId, infografias } = await leerMaterialDelModulo(usuario, moduloSlug, db);
  if (!infografias.length) throw noEncontrado("Este módulo todavía no tiene infografías");
  return { moduloId, infografias };
}
