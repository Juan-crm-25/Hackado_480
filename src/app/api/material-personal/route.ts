import { ruta } from "@/server/compartido/http";
import { esquemaPeticionMaterialPersonal, esquemaQueryMaterialPersonal } from "@/server/material/esquemas";
import { crearMaterialPersonal, listarMiMaterialPersonal } from "@/server/material/servicio";

/**
 * Material personal (#2). Ver agents/material-personal.md. El alumno es el usuario de la SESIÓN:
 * - GET ?moduloId=<slug>: su material (solo el suyo), del más reciente al más antiguo.
 * - POST: se crea un resumen o unas tarjetas. Exige el curso y cuenta para SU límite diario.
 */
export const GET = ruta({ acceso: "usuario", query: esquemaQueryMaterialPersonal }, ({ usuario, query }) =>
  listarMiMaterialPersonal(usuario, query.moduloId),
);

export const POST = ruta({ acceso: "usuario", cuerpo: esquemaPeticionMaterialPersonal }, ({ usuario, cuerpo }) =>
  crearMaterialPersonal(usuario, cuerpo),
);
