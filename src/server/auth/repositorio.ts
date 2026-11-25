import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { cuenta, sesion, usuario } from "@/lib/db/schema";
import type { UsuarioSesion } from "./roles";

/** Proveedor de la cuenta de email y contraseña (el mismo nombre que usa Better Auth). */
export const PROVEEDOR_CREDENCIAL = "credential";

const columnasUsuarioSesion = {
  id: usuario.id,
  nombre: usuario.nombre,
  email: usuario.email,
  rol: usuario.rol,
  emailVerificado: usuario.emailVerificado,
};

/** Usuario y hash de su contraseña, o `null` si no tiene cuenta de email y contraseña. */
export async function leerCredencial(
  email: string,
  db: Db,
): Promise<{ usuario: UsuarioSesion; passwordHash: string | null } | null> {
  const [fila] = await db
    .select({ ...columnasUsuarioSesion, passwordHash: cuenta.passwordHash })
    .from(usuario)
    .innerJoin(cuenta, and(eq(cuenta.usuarioId, usuario.id), eq(cuenta.proveedor, PROVEEDOR_CREDENCIAL)))
    .where(eq(usuario.email, email))
    .limit(1);
  if (!fila) return null;
  const { passwordHash, ...datosUsuario } = fila;
  return { usuario: datosUsuario, passwordHash };
}

export async function existeEmail(email: string, db: Db): Promise<boolean> {
  const [fila] = await db.select({ id: usuario.id }).from(usuario).where(eq(usuario.email, email)).limit(1);
  return fila !== undefined;
}

/**
 * Crea el usuario y su cuenta de email y contraseña en una transacción.
 * Devuelve `null` si el email ya existe (también si otra petición lo creó a la vez).
 */
export async function crearUsuarioConCredencial(
  datos: { nombre: string; email: string; seudonimo: string; passwordHash: string },
  db: Db,
): Promise<UsuarioSesion | null> {
  return db.transaction(async (tx) => {
    const [nuevo] = await tx
      .insert(usuario)
      .values({
        nombre: datos.nombre,
        email: datos.email,
        seudonimo: datos.seudonimo,
        rol: "alumno",
        // Sin verificar: sin correo no hay forma de comprobar el email, y una matrícula solo se enlaza a un
        // email verificado (docs/arquitectura.md, «Matrícula por email»). Los usuarios del seed sí lo están.
        emailVerificado: false,
      })
      .onConflictDoNothing({ target: usuario.email })
      .returning(columnasUsuarioSesion);
    if (!nuevo) return null;

    await tx.insert(cuenta).values({
      usuarioId: nuevo.id,
      proveedor: PROVEEDOR_CREDENCIAL,
      idCuentaProveedor: nuevo.id,
      passwordHash: datos.passwordHash,
    });
    return nuevo;
  });
}

export async function crearSesion(datos: { usuarioId: string; token: string; expira: Date }, db: Db): Promise<void> {
  await db.insert(sesion).values(datos);
}

/** Usuario de una sesión que no ha caducado, o `null`. */
export async function leerUsuarioDeSesion(token: string, db: Db): Promise<UsuarioSesion | null> {
  const [fila] = await db
    .select(columnasUsuarioSesion)
    .from(sesion)
    .innerJoin(usuario, eq(usuario.id, sesion.usuarioId))
    .where(and(eq(sesion.token, token), gt(sesion.expira, sql`now()`)))
    .limit(1);
  return fila ?? null;
}

export async function borrarSesion(token: string, db: Db): Promise<void> {
  await db.delete(sesion).where(eq(sesion.token, token));
}
