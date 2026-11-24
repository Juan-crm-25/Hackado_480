import "server-only";
import { obtenerSesion } from "@/server/auth/sesion";
import { crearRuta } from "./ruta";

/** Constructor de Route Handlers con la sesión real. Uso: docs/arquitectura.md, sección 3. */
export const ruta = crearRuta({ obtenerSesion });

export type { ArgumentosManejador, ContextoRuta, ManejadorRuta, OpcionesRuta } from "./ruta";
export { respuestaError, respuestaJson, type RespuestaError } from "./respuestas";
export { ErrorApp, type CodigoError } from "../errores";
