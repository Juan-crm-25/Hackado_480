/**
 * Prueba public/sw.js tal cual: lo ejecuta en un contexto aislado con `self`, `caches` y `fetch` simulados
 * y le manda eventos de instalación, activación y peticiones, como haría el navegador.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

const ORIGEN = "https://app.test";
const CODIGO = readFileSync(join(__dirname, "../../../public/sw.js"), "utf8");

type PeticionFalsa = { url: string; method: string; mode: string; headers: Headers };
type Oyente = (evento: Record<string, unknown>) => void;

function peticion(ruta: string, opciones: { method?: string; mode?: string; headers?: Record<string, string> } = {}): PeticionFalsa {
  return {
    url: new URL(ruta, ORIGEN).href,
    method: opciones.method ?? "GET",
    mode: opciones.mode ?? "no-cors",
    headers: new Headers(opciones.headers),
  };
}

const clave = (r: string | PeticionFalsa) => (typeof r === "string" ? new URL(r, ORIGEN).href : r.url);

/** Carga el service worker con una red simulada; devuelve sus oyentes, las cachés y la red. */
function cargar(red: (r: string | PeticionFalsa) => Promise<Response>) {
  const oyentes: Record<string, Oyente> = {};
  const almacen = new Map<string, Map<string, Response>>();
  const abrir = (nombre: string) => {
    if (!almacen.has(nombre)) almacen.set(nombre, new Map());
    const cache = almacen.get(nombre)!;
    return {
      match: async (r: string | PeticionFalsa) => cache.get(clave(r))?.clone(),
      put: async (r: string | PeticionFalsa, res: Response) => void cache.set(clave(r), res),
      addAll: async (urls: string[]) => {
        for (const u of urls) cache.set(clave(u), await red(u));
      },
    };
  };
  const caches = {
    open: async (nombre: string) => abrir(nombre),
    keys: async () => [...almacen.keys()],
    delete: async (nombre: string) => almacen.delete(nombre),
    match: async (r: string | PeticionFalsa) => {
      for (const cache of almacen.values()) {
        const hit = cache.get(clave(r));
        if (hit) return hit.clone();
      }
      return undefined;
    },
  };
  const self = {
    location: new URL(ORIGEN),
    addEventListener: (tipo: string, f: Oyente) => void (oyentes[tipo] = f),
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
  };
  vm.runInNewContext(CODIGO, { self, caches, fetch: red, URL, Response, Headers, Promise, console });
  return { oyentes, almacen, self };
}

/** Lanza un evento con waitUntil y espera a que termine. */
async function evento(oyentes: Record<string, Oyente>, tipo: string) {
  let espera: Promise<unknown> = Promise.resolve();
  oyentes[tipo]({ waitUntil: (p: Promise<unknown>) => void (espera = p) });
  await espera;
}

/** Manda una petición; devuelve la respuesta del service worker o null si la deja pasar al navegador. */
async function pedir(oyentes: Record<string, Oyente>, r: PeticionFalsa): Promise<Response | null> {
  let respuesta: Promise<Response> | null = null;
  const segundoPlano: Promise<unknown>[] = [];
  oyentes.fetch({
    request: r,
    respondWith: (p: Promise<Response>) => void (respuesta = p),
    waitUntil: (p: Promise<unknown>) => void segundoPlano.push(p),
  });
  const res = respuesta ? await respuesta : null;
  await Promise.all(segundoPlano);
  return res;
}

const ok = (texto: string) => new Response(texto, { status: 200 });

describe("service worker de la PWA (public/sw.js)", () => {
  it("al instalarse guarda la página sin conexión y los iconos, y se activa ya", async () => {
    const red = vi.fn(async (r: string | PeticionFalsa) => ok(`red ${clave(r)}`));
    const { oyentes, almacen, self } = cargar(red);
    await evento(oyentes, "install");

    const guardadas = [...almacen.values()].flatMap((c) => [...c.keys()]);
    expect(guardadas).toEqual(
      expect.arrayContaining([`${ORIGEN}/sin-conexion`, `${ORIGEN}/icons/icon-192.png`, `${ORIGEN}/icons/icon-512.png`]),
    );
    expect(self.skipWaiting).toHaveBeenCalled();
  });

  it("al activarse borra las cachés de versiones anteriores, pero no las de otros", async () => {
    const { oyentes, almacen, self } = cargar(async () => ok("x"));
    await evento(oyentes, "install");
    const actual = [...almacen.keys()][0];
    almacen.set("hackado-viejo", new Map());
    almacen.set("otra-app", new Map());

    await evento(oyentes, "activate");
    expect([...almacen.keys()].sort()).toEqual([actual, "otra-app"].sort());
    expect(self.clients.claim).toHaveBeenCalled();
  });

  it("JS, CSS y fuentes de /_next/static: primero la caché (llevan hash, nunca cambian)", async () => {
    const red = vi.fn(async () => ok("de la red"));
    const { oyentes } = cargar(red);
    const js = peticion("/_next/static/chunks/app-123.js");

    expect(await (await pedir(oyentes, js))!.text()).toBe("de la red");
    expect(await (await pedir(oyentes, js))!.text()).toBe("de la red");
    expect(red).toHaveBeenCalledTimes(1);
  });

  it("imágenes de public/: responde con la caché y la refresca por detrás", async () => {
    let version = 1;
    const red = vi.fn(async () => ok(`imagen v${version}`));
    const { oyentes } = cargar(red);
    const img = peticion("/ilustraciones/astronauta.svg");

    expect(await (await pedir(oyentes, img))!.text()).toBe("imagen v1");
    version = 2;
    expect(await (await pedir(oyentes, img))!.text()).toBe("imagen v1"); // la de la caché, al instante
    expect(await (await pedir(oyentes, img))!.text()).toBe("imagen v2"); // ya refrescada
  });

  it("páginas: siempre de la red y nunca se guardan (llevan datos del alumno)", async () => {
    const red = vi.fn(async () => ok("panel de Lucía"));
    const { oyentes, almacen } = cargar(red);
    await evento(oyentes, "install");
    const res = await pedir(oyentes, peticion("/dashboard", { mode: "navigate" }));

    expect(await res!.text()).toBe("panel de Lucía");
    const guardadas = [...almacen.values()].flatMap((c) => [...c.keys()]);
    expect(guardadas).not.toContain(`${ORIGEN}/dashboard`);
  });

  it("páginas sin conexión: muestra la página «sin conexión» guardada", async () => {
    let conectado = true;
    const red = vi.fn(async (r: string | PeticionFalsa) => {
      if (!conectado) throw new TypeError("Failed to fetch");
      return ok(`red ${clave(r)}`);
    });
    const { oyentes } = cargar(red);
    await evento(oyentes, "install");
    conectado = false;

    const res = await pedir(oyentes, peticion("/dashboard/desarrollo-web", { mode: "navigate" }));
    expect(await res!.text()).toBe(`red ${ORIGEN}/sin-conexion`);
  });

  it("no toca la API, las peticiones RSC, los POST ni otros dominios", async () => {
    const red = vi.fn(async () => ok("x"));
    const { oyentes } = cargar(red);
    for (const r of [
      peticion("/api/progreso"),
      peticion("/dashboard?_rsc=abc"),
      peticion("/dashboard", { headers: { RSC: "1" } }),
      peticion("/api/auth/logout", { method: "POST" }),
      { ...peticion("/x"), url: "https://www.youtube.com/embed/abc" },
    ]) {
      expect(await pedir(oyentes, r)).toBeNull();
    }
    expect(red).not.toHaveBeenCalled();
  });
});
