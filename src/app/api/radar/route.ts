import { radarDemo } from "@/lib/datos-prueba";
import type { InformeRadar } from "@/lib/types";

/** GET /api/radar — informe para los tutores. Datos de prueba hasta que esté el Radar (#5). */
export async function GET() {
  const informe: InformeRadar = radarDemo;
  return Response.json(informe);
}
