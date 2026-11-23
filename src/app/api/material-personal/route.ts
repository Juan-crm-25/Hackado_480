import type { NextRequest } from "next/server";
import { ErrorIA } from "@/lib/ai/cliente";
import { consumirConsulta } from "@/lib/ai/limite";
import { ErrorMaterial, generarMaterialPersonal, MAX_ENFOQUE } from "@/lib/agentes/material-personal";
import { getModulo } from "@/lib/catalogo";
import { alumnosDemo } from "@/lib/datos-prueba";
import { guardarMaterialPersonal, listarMaterialPersonal } from "@/lib/material-personal";
import type { ErrorApi, MaterialPersonal, PeticionMaterialPersonal, RespuestaMaterialPersonal } from "@/lib/types";

/** GET /api/material-personal?alumnoId=a1&moduloId=m2-css — material que se ha creado el alumno (#2). */
export async function GET(req: NextRequest) {
  const alumnoId = req.nextUrl.searchParams.get("alumnoId");
  if (!alumnoId) return error("Falta el parámetro alumnoId", 400);
  const moduloId = req.nextUrl.searchParams.get("moduloId") ?? undefined;
  const lista: MaterialPersonal[] = listarMaterialPersonal(alumnoId, moduloId);
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

  // Antes de gastar una consulta del alumno: sin transcripciones no hay de dónde generar.
  if (!modulo.videos.some((v) => v.transcripcion)) {
    return error(`Todavía no tengo el contenido de los vídeos del módulo «${modulo.titulo}».`, 422);
  }

  const limite = consumirConsulta(alumno.id);
  if (!limite.permitido) {
    return error("Has llegado al límite de consultas de hoy. Mañana podrás crear más material.", 429);
  }

  try {
    const material = await generarMaterialPersonal({ modulo, peticion, nombresOcultos: [alumno.nombre] });
    guardarMaterialPersonal(material);
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
