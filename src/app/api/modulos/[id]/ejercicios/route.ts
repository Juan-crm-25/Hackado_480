import { getModulo } from "@/lib/catalogo";
import { ejerciciosDemo } from "@/lib/datos-prueba";
import type { EjercicioPublico, ErrorApi } from "@/lib/types";

/**
 * GET /api/modulos/:id/ejercicios — ejercicios aprobados del módulo, SIN solución ni rúbrica.
 * Hoy devuelve datos de prueba; el banco real llega con #4 y la selección de 5–8 con #3.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getModulo(id)) {
    return Response.json({ error: `No existe el módulo "${id}"` } satisfies ErrorApi, { status: 404 });
  }
  const ejercicios: EjercicioPublico[] = ejerciciosDemo
    .filter((e) => e.moduloId === id && e.estado === "aprobado")
    .map(
      (e): EjercicioPublico => ({
        id: e.id,
        moduloId: e.moduloId,
        conceptoId: e.conceptoId,
        tipo: e.tipo,
        enunciado: e.enunciado,
        opciones: e.opciones,
        referencia: e.referencia,
      }),
    );
  return Response.json(ejercicios);
}
