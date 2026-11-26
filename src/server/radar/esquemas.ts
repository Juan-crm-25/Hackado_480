import "server-only";
import { z } from "zod";

/** `GET /api/radar?curso=<slug>`: el curso del que se pide el Radar. */
export const esquemaQueryRadar = z.object({ curso: z.string().trim().min(1).max(100) });
