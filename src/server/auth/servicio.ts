import "server-only";
import { randomBytes } from "node:crypto";
import { cifrarContrasena, comprobarContrasena } from "@/lib/contrasena";
import { getDb, type Db } from "@/lib/db/client";
import { seudonimoDe } from "@/lib/db/seed/datos";
import { conflicto, noAutenticado } from "../compartido/errores";
import type { DatosLogin, DatosRegistro } from "./esquemas";
import {
  borrarSesion,
  crearSesion,
  crearUsuarioConCredencial,
  existeEmail,
  leerCredencial,
  leerUsuarioDeSesion,
} from "./repositorio";
import type { UsuarioSesion } from "./roles";

/**
 * Login SIMULADO de la demo (SPEC.md, «Login simulado»): email y contraseña contra la tabla `cuenta`,
 * sesión en la tabla `sesion` y su token en una cookie. Sin verificación de email ni Better Auth.
 * Al conectar Better Auth se sustituye este módulo; `obtenerSesion()` mantiene su firma.
 */

const DURACION_SESION_MS = 7 * 24 * 60 * 60 * 1000;
const CREDENCIALES_INCORRECTAS = "Email o contraseña incorrectos";

/**
 * Hash de relleno: si el email no tiene cuenta se comprueba la contraseña contra él, para que la
 * respuesta tarde lo mismo y no revele qué emails existen. Se calcula una vez, al primer uso.
 */
let hashDeRelleno: Promise<string> | undefined;
const obtenerHashDeRelleno = () => (hashDeRelleno ??= cifrarContrasena(randomBytes(16).toString("hex")));

export type SesionIniciada = { usuario: UsuarioSesion; token: string; expira: Date };

async function abrirSesion(usuario: UsuarioSesion, db: Db): Promise<SesionIniciada> {
  const token = randomBytes(32).toString("base64url");
  const expira = new Date(Date.now() + DURACION_SESION_MS);
  await crearSesion({ usuarioId: usuario.id, token, expira }, db);
  return { usuario, token, expira };
}

/** Comprueba email y contraseña y abre una sesión. Mismo error si falla el email o la contraseña. */
export async function iniciarSesion(datos: DatosLogin, db: Db = getDb()): Promise<SesionIniciada> {
  const credencial = await leerCredencial(datos.email, db);
  const guardada = credencial?.passwordHash ?? (await obtenerHashDeRelleno());
  const valida = await comprobarContrasena(datos.contrasena, guardada);
  if (!credencial || !valida) throw noAutenticado(CREDENCIALES_INCORRECTAS);
  return abrirSesion(credencial.usuario, db);
}

/**
 * Crea una cuenta de alumno sin verificar (los profesores y admins se dan de alta internamente) y abre su sesión.
 */
export async function registrar(datos: DatosRegistro, db: Db = getDb()): Promise<SesionIniciada> {
  const yaExiste = conflicto("Ya hay una cuenta con ese email");
  if (await existeEmail(datos.email, db)) throw yaExiste;

  const usuario = await crearUsuarioConCredencial(
    {
      nombre: datos.nombre,
      email: datos.email,
      seudonimo: seudonimoDe(datos.email, "alumno"),
      passwordHash: await cifrarContrasena(datos.contrasena),
    },
    db,
  );
  if (!usuario) throw yaExiste;
  return abrirSesion(usuario, db);
}

export async function cerrarSesion(token: string, db: Db = getDb()): Promise<void> {
  await borrarSesion(token, db);
}

export async function usuarioDeToken(token: string, db: Db = getDb()): Promise<UsuarioSesion | null> {
  return leerUsuarioDeSesion(token, db);
}
