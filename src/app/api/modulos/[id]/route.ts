import { getModulo } from "@/lib/catalogo";
import type { ErrorApi, Modulo } from "@/lib/types";

/** GET /api/modulos/:id — un módulo con sus vídeos y conceptos. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const modulo = getModulo(id);
  if (!modulo) {
    return Response.json({ error: `No existe el módulo "${id}"` } satisfies ErrorApi, { status: 404 });
  }
  return Response.json(modulo satisfies Modulo);
}
