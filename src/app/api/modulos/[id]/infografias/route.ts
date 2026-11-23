import { getModulo } from "@/lib/catalogo";
import { leerInfografiasPublicadas } from "@/lib/infografias";
import type { ErrorApi, InfografiasModulo } from "@/lib/types";

/**
 * GET /api/modulos/:id/infografias — infografías comunes del módulo (#7), una por concepto.
 * Solo si están revisadas; si no, 404 como si no existieran. No llama a la IA.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getModulo(id)) {
    return Response.json({ error: `No existe el módulo "${id}"` } satisfies ErrorApi, { status: 404 });
  }
  const datos = leerInfografiasPublicadas(id);
  if (!datos) {
    return Response.json({ error: "Este módulo todavía no tiene infografías" } satisfies ErrorApi, { status: 404 });
  }
  return Response.json(datos satisfies InfografiasModulo);
}
