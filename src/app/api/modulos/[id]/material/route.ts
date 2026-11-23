import { getModulo } from "@/lib/catalogo";
import { leerMaterialComun } from "@/lib/material";
import type { ErrorApi, MaterialComun } from "@/lib/types";

/**
 * GET /api/modulos/:id/material — material común del módulo (resumen + tarjetas), igual para todos.
 * Se genera con `npm run generar:material` (#2); aquí solo se lee: no se llama a la IA.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getModulo(id)) {
    return Response.json({ error: `No existe el módulo "${id}"` } satisfies ErrorApi, { status: 404 });
  }
  const material = leerMaterialComun(id);
  if (!material) {
    return Response.json({ error: "Este módulo todavía no tiene material de repaso" } satisfies ErrorApi, { status: 404 });
  }
  return Response.json(material satisfies MaterialComun);
}
