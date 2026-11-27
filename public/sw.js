/*
 * Service worker de la PWA de 480 Academy: cachea la interfaz para que cargue rápido y se pueda abrir sin conexión.
 * Lo registra src/lib/pwa/registro.ts (solo en producción). Pruebas: src/lib/pwa/service-worker.test.ts.
 *
 * - /_next/static (JS, CSS y fuentes con hash en el nombre): primero la caché, porque nunca cambian.
 * - Imágenes de public/: se responde con la caché y se refresca por detrás (no llevan hash).
 * - Páginas: SIEMPRE de la red y nunca se guardan, porque llevan datos del alumno (en un dispositivo compartido
 *   quedarían a la vista tras cerrar sesión). Sin conexión se muestra /sin-conexion, guardada al instalar.
 * - API, peticiones RSC, POST y otros dominios (YouTube): no se tocan.
 *
 * Al cambiar este fichero, sube VERSION: el worker nuevo borra las cachés de la versión anterior.
 */
const VERSION = "v1";
const CACHE = `hackado-${VERSION}`;
const PAGINA_SIN_CONEXION = "/sin-conexion";
const PRECACHE = [PAGINA_SIN_CONEXION, "/icons/icon-192.png", "/icons/icon-512.png"];
const CON_HASH = /^\/_next\/static\//;
const IMAGENES = /^\/(icons|images|ilustraciones|banners|avatars)\//;

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(nombres.filter((n) => n.startsWith("hackado-") && n !== CACHE).map((n) => caches.delete(n))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const peticion = evento.request;
  if (peticion.method !== "GET") return;
  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;

  if (peticion.mode === "navigate") {
    evento.respondWith(fetch(peticion).catch(() => caches.match(PAGINA_SIN_CONEXION)));
    return;
  }
  // Datos de React Server Components: son de cada alumno y cambian; los gestiona Next.js.
  if (url.searchParams.has("_rsc") || peticion.headers.get("RSC")) return;

  if (CON_HASH.test(url.pathname)) {
    evento.respondWith(primeroCache(peticion));
  } else if (IMAGENES.test(url.pathname)) {
    evento.respondWith(cacheYRefresco(peticion, evento));
  }
});

async function primeroCache(peticion) {
  const cache = await caches.open(CACHE);
  const guardada = await cache.match(peticion);
  if (guardada) return guardada;
  const respuesta = await fetch(peticion);
  if (respuesta.ok) await cache.put(peticion, respuesta.clone());
  return respuesta;
}

async function cacheYRefresco(peticion, evento) {
  const cache = await caches.open(CACHE);
  const guardada = await cache.match(peticion);
  const deLaRed = fetch(peticion).then(async (respuesta) => {
    if (respuesta.ok) await cache.put(peticion, respuesta.clone());
    return respuesta;
  });
  if (guardada) {
    evento.waitUntil(deLaRed.catch(() => undefined));
    return guardada;
  }
  return deLaRed;
}
