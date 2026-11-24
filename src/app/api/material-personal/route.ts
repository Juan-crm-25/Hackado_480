import type { NextRequest } from "next/server";
import { ErrorIA } from "@/lib/ai/cliente";
import { consumirConsulta } from "@/lib/ai/limite";
import { ErrorMaterial, generarMaterialPersonal, MAX_ENFOQUE } from "@/lib/agentes/material-personal";
import { getModulo } from "@/lib/catalogo";
import { alumnosDemo } from "@/lib/datos-prueba";
import type { ErrorApi, MaterialPersonal, PeticionMaterialPersonal, RespuestaMaterialPersonal } from "@/lib/types";
import { guardarMaterialPersonal, listarMaterialPersonal } from "@/server/material/repositorio";
import { buscarConcepto, buscarModulo, buscarUsuarioDemo, MENSAJE_SIN_SEED } from "@/server/matriculas/demo";

/**
 * GET /api/material-personal?alumnoId=a1&moduloId=m2-css — material que se ha creado el alumno (#2).
 * Hasta el login, el alumno llega en `alumnoId` y se busca en la BBDD con el puente de src/server/matriculas/demo.ts.
 */
export async function GET(req: NextRequest) {
  const alumnoId = req.nextUrl.searchParams.get("alumnoId");
  if (!alumnoId) return error("Falta el parámetro alumnoId", 400);
  const moduloSlug = req.nextUrl.searchParams.get("moduloId") ?? undefined;

  // Un alumno o un módulo que no existen no tienen material.
  if (!alumnosDemo.some((a) => a.id === alumnoId)) return Response.json([]);
  const usuario = await buscarUsuarioDemo(alumnoId);
  if (!usuario) return error(`El alumno "${alumnoId}" no está en la base de datos. ${MENSAJE_SIN_SEED}`, 404);
  let moduloId: string | undefined;
  if (moduloSlug) {
    const modulo = await buscarModulo(moduloSlug);
    if (!modulo) return Response.json([]);
    moduloId = modulo.id;
  }

  const lista: MaterialPersonal[] = await listarMaterialPersonal({ usuarioId: usuario.id, alumnoId, moduloId });
  return Response.json(lista);
}

/**
 * POST /api/material-personal — el alumno se crea un resumen o unas tarjetas a su medida (#2).
 * Cuenta como una consulta del límite diario. Ver agents/material-personal.md.
 */
export async function POST(req: Request) {
  let peticion: PeticionMaterialPersonal;
  try {
    peticion = (await req.json()) as PeticionMaterialPersonal;
  } catch {
    return error("El cuerpo debe ser JSON", 400);
  }
  if (!peticion?.alumnoId || !peticion?.moduloId || (peticion.tipo !== "resumen" && peticion.tipo !== "tarjetas")) {
    return error('Faltan campos: alumnoId, moduloId y tipo ("resumen" o "tarjetas")', 400);
  }
  if (peticion.enfoque !== undefined && (typeof peticion.enfoque !== "string" || peticion.enfoque.length > MAX_ENFOQUE)) {
    return error(`El enfoque debe ser un texto de ${MAX_ENFOQUE} caracteres como máximo`, 400);
  }

  const modulo = getModulo(peticion.moduloId);
  if (!modulo) return error(`No existe el módulo "${peticion.moduloId}"`, 404);
  const alumno = alumnosDemo.find((a) => a.id === peticion.alumnoId);
  if (!alumno) return error(`No existe el alumno "${peticion.alumnoId}"`, 404);

  // Filas de la BBDD, antes de gastar una consulta: sin ellas no se podría guardar el material.
  const usuario = await buscarUsuarioDemo(alumno.id);
  const moduloBd = await buscarModulo(modulo.id);
  if (!usuario || !moduloBd) return error(`Faltan los datos de la demo en la base de datos. ${MENSAJE_SIN_SEED}`, 404);
  // Un concepto que no es de este módulo lo rechaza el generador (422), como antes.
  let conceptoBdId: string | null = null;
  if (peticion.conceptoId && modulo.conceptos.some((c) => c.id === peticion.conceptoId)) {
    const conceptoBd = await buscarConcepto(moduloBd.id, peticion.conceptoId);
    if (!conceptoBd) return error(`Faltan los datos de la demo en la base de datos. ${MENSAJE_SIN_SEED}`, 404);
    conceptoBdId = conceptoBd.id;
  }

  // Antes de gastar una consulta del alumno: sin transcripciones no hay de dónde generar.
  if (!modulo.videos.some((v) => v.transcripcion)) {
    return error(`Todavía no tengo el contenido de los vídeos del módulo «${modulo.titulo}».`, 422);
  }

  const limite = await consumirConsulta(usuario.id);
  if (!limite.permitido) {
    return error("Has llegado al límite de consultas de hoy. Mañana podrás crear más material.", 429);
  }

  try {
    const material = await generarMaterialPersonal({ modulo, peticion, nombresOcultos: [alumno.nombre] });
    await guardarMaterialPersonal(material, { usuarioId: usuario.id, moduloId: moduloBd.id, conceptoId: conceptoBdId });
    return Response.json({ material, consultasRestantes: limite.restantes } satisfies RespuestaMaterialPersonal);
  } catch (e) {
    if (e instanceof ErrorMaterial) return error(e.message, 422);
    console.error(`[material-personal] ${e instanceof ErrorIA ? e.message : "error inesperado"}`);
    return error("No se ha podido crear el material ahora mismo. Inténtalo de nuevo en unos segundos.", 502);
  }
}

function error(mensaje: string, estado: number) {
  return Response.json({ error: mensaje } satisfies ErrorApi, { status: estado });
}
