/**
 * Cifrado de contraseñas con scrypt (node:crypto), sin dependencias.
 * Formato guardado: `scrypt$<sal hex>$<hash hex>`.
 *
 * Vive en src/lib (no en src/server) porque también lo usa el seed, que se ejecuta fuera de Next.
 * Solo se importa desde código de servidor: usa node:crypto.
 */
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const LONGITUD_SAL = 16;
const LONGITUD_HASH = 64;

function derivar(contrasena: string, sal: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(contrasena, sal, LONGITUD_HASH, (error, clave) => (error ? reject(error) : resolve(clave)));
  });
}

export async function cifrarContrasena(contrasena: string): Promise<string> {
  const sal = randomBytes(LONGITUD_SAL);
  const hash = await derivar(contrasena, sal);
  return `scrypt$${sal.toString("hex")}$${hash.toString("hex")}`;
}

/** ¿Coincide la contraseña con la guardada? Un valor guardado vacío o mal formado nunca coincide. */
export async function comprobarContrasena(contrasena: string, guardada: string | null | undefined): Promise<boolean> {
  const [algoritmo, salHex, hashHex] = (guardada ?? "").split("$");
  if (algoritmo !== "scrypt" || !salHex || !hashHex) return false;

  const sal = Buffer.from(salHex, "hex");
  const esperado = Buffer.from(hashHex, "hex");
  if (sal.length !== LONGITUD_SAL || esperado.length !== LONGITUD_HASH) return false;

  return timingSafeEqual(await derivar(contrasena, sal), esperado);
}
