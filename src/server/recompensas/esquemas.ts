import "server-only";
import { z } from "zod";

/** POST /api/yo/premios/canje: el id del premio (ver src/lib/demo/premios.ts). */
export const esquemaCanjePremio = z.object({ premio: z.string().trim().min(1).max(60) });

/** POST /api/yo/premios/demo: solo las cantidades de los botones de demo, nunca una cualquiera. */
export const esquemaPuntosDemo = z.object({ puntos: z.union([z.literal(100), z.literal(1000)]) });
