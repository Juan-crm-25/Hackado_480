import "server-only";
import { z } from "zod";
import { cumpleAcceso, type NivelAcceso, type UsuarioSesion } from "@/server/auth/roles";
import { datosInvalidos, noAutenticado, prohibido } from "../errores";
import { respuestaError, respuestaJson } from "./respuestas";

type Esquema = z.ZodType;

/** Lo que valida el esquema, o `undefined` si el endpoint no declara ese esquema. */
type Validado<S> = S extends Esquema ? z.output<S> : undefined;

/** En `publico` puede no haber sesión; en el resto de niveles `ruta()` garantiza que hay usuario. */
type UsuarioDe<A extends NivelAcceso> = A extends "publico" ? UsuarioSesion | null : UsuarioSesion;

export type OpcionesRuta<
  A extends NivelAcceso,
  P extends Esquema | undefined,
  Q extends Esquema | undefined,
  C extends Esquema | undefined,
> = {
  acceso: A;
  params?: P;
  query?: Q;
  cuerpo?: C;
};

export type ArgumentosManejador<
  A extends NivelAcceso,
  P extends Esquema | undefined,
  Q extends Esquema | undefined,
  C extends Esquema | undefined,
> = {
  usuario: UsuarioDe<A>;
  params: Validado<P>;
  query: Validado<Q>;
  cuerpo: Validado<C>;
  request: Request;
};

/** Contexto que Next.js pasa a un Route Handler (`params` es una Promise desde Next 15). */
export type ContextoRuta = { params: Promise<Record<string, string | string[]>> };

export type ManejadorRuta = (request: Request, contexto: ContextoRuta) => Promise<Response>;

export type DependenciasRuta = {
  obtenerSesion: (request: Request) => Promise<UsuarioSesion | null>;
};

function validar(esquema: Esquema | undefined, valor: unknown): unknown {
  if (!esquema) return undefined;
  const resultado = esquema.safeParse(valor);
  if (!resultado.success) throw datosInvalidos(z.flattenError(resultado.error));
  return resultado.data;
}

async function leerJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw datosInvalidos(undefined, "El cuerpo de la petición no es JSON válido");
  }
}

/**
 * Crea `ruta()` con sus dependencias (la sesión), para poder probarla sin Better Auth.
 * Orden: sesión → nivel de acceso → params → query → cuerpo → manejador → JSON.
 * Cualquier error lanzado se traduce con `respuestaError()`.
 */
export function crearRuta({ obtenerSesion }: DependenciasRuta) {
  return function ruta<
    A extends NivelAcceso,
    P extends Esquema | undefined = undefined,
    Q extends Esquema | undefined = undefined,
    C extends Esquema | undefined = undefined,
  >(
    opciones: OpcionesRuta<A, P, Q, C>,
    manejador: (argumentos: ArgumentosManejador<A, P, Q, C>) => unknown,
  ): ManejadorRuta {
    return async (request, contexto) => {
      try {
        const usuario = await obtenerSesion(request);
        if (!cumpleAcceso(usuario, opciones.acceso)) {
          throw usuario ? prohibido() : noAutenticado();
        }

        const params = validar(opciones.params, await contexto.params);
        const query = validar(opciones.query, Object.fromEntries(new URL(request.url).searchParams));
        const cuerpo = opciones.cuerpo ? validar(opciones.cuerpo, await leerJson(request)) : undefined;

        const resultado = await manejador({
          usuario,
          params,
          query,
          cuerpo,
          request,
        } as ArgumentosManejador<A, P, Q, C>);

        return resultado instanceof Response ? resultado : respuestaJson(resultado);
      } catch (error) {
        return respuestaError(error);
      }
    };
  };
}
