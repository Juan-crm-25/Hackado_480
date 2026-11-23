import { ejerciciosDemo } from "@/lib/datos-prueba";
import type { ErrorApi, Intento, PeticionIntento } from "@/lib/types";

/**
 * POST /api/intentos — corrige la respuesta de un alumno a un ejercicio.
 * Tipo test: se corrige con código, sin IA.
 * Respuesta abierta o código: la corregirá el agente corrector (#3). Hoy queda pendiente de revisión.
 * Todavía no se guarda nada: la persistencia llega con la BBDD (#13).
 */
export async function POST(req: Request) {
  let peticion: PeticionIntento;
  try {
    peticion = (await req.json()) as PeticionIntento;
  } catch {
    return Response.json({ error: "El cuerpo debe ser JSON" } satisfies ErrorApi, { status: 400 });
  }
  if (!peticion?.alumnoId || !peticion?.ejercicioId || peticion.respuesta === undefined) {
    return Response.json(
      { error: "Faltan campos: alumnoId, ejercicioId y respuesta" } satisfies ErrorApi,
      { status: 400 },
    );
  }

  const ejercicio = ejerciciosDemo.find((e) => e.id === peticion.ejercicioId);
  if (!ejercicio) {
    return Response.json({ error: `No existe el ejercicio "${peticion.ejercicioId}"` } satisfies ErrorApi, { status: 404 });
  }

  const base = {
    id: crypto.randomUUID(),
    alumnoId: peticion.alumnoId,
    ejercicioId: ejercicio.id,
    respuesta: peticion.respuesta,
    fecha: new Date().toISOString(),
  };

  let intento: Intento;
  if (ejercicio.tipo === "test") {
    const correcto = Number(peticion.respuesta) === ejercicio.solucion;
    intento = {
      ...base,
      correcto,
      puntuacion: correcto ? 1 : 0,
      feedback: correcto ? "¡Correcto!" : "No es correcto. Repasa este momento del vídeo.",
      repasar: correcto ? undefined : ejercicio.referencia,
    };
  } else {
    intento = {
      ...base,
      correcto: false,
      puntuacion: 0,
      feedback: "Corrección con IA pendiente de implementar (#3).",
      revisionHumana: true,
    };
  }

  return Response.json(intento);
}
