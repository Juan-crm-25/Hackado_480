import type { NextRequest } from "next/server";
import { progresoDemo } from "@/lib/datos-prueba";
import type { ErrorApi, Progreso } from "@/lib/types";

/** GET /api/progreso?alumnoId=a1 — progreso del alumno en cada módulo. Datos de prueba hasta #13. */
export async function GET(req: NextRequest) {
  const alumnoId = req.nextUrl.searchParams.get("alumnoId");
  if (!alumnoId) {
    return Response.json({ error: "Falta el parámetro alumnoId" } satisfies ErrorApi, { status: 400 });
  }
  const progreso: Progreso[] = progresoDemo.filter((p) => p.alumnoId === alumnoId);
  return Response.json(progreso);
}
