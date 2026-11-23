import { getCurso } from "@/lib/catalogo";
import type { Curso } from "@/lib/types";

/** GET /api/catalogo — el curso con sus módulos, vídeos y conceptos. */
export async function GET() {
  const curso: Curso = getCurso();
  return Response.json(curso);
}
