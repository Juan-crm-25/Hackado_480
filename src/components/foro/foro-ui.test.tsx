import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AutorForo, ComentarioHilo, HiloForo } from "@/server/foro/servicio";
import { Celebracion, Confeti, puntosGanados } from "./celebracion";
import { EsqueletoHilo, EsqueletoTemas } from "./esqueletos";
import { FormularioDuda } from "./formulario-duda";
import { SeccionForo } from "./seccion-foro";

const ANA: AutorForo = { id: "u-ana", nombre: "Ana Pérez", imagenUrl: null, esIa: false, esProfesor: false };
const SENSEI: AutorForo = { id: "u-sensei", nombre: "Sensei", imagenUrl: "/avatars/sensei.svg", esIa: true, esProfesor: false };

function comentario(datos: Partial<ComentarioHilo> & Pick<ComentarioHilo, "id">): ComentarioHilo {
  return {
    cuerpo: "…",
    autor: ANA,
    respuestaAId: null,
    creado: "2026-11-20T10:00:00.000Z",
    validacion: "pendiente",
    validadoPor: null,
    puntos: 0,
    puntosProfesor: null,
    respuestas: [],
    ...datos,
  };
}

function hilo(comentarios: ComentarioHilo[]): HiloForo {
  return {
    tema: { id: "t-1", titulo: "¿Cómo centro un div?", cuerpo: "…", creado: "2026-11-20T09:00:00.000Z", autor: ANA, puntosProfesor: null },
    curso: { slug: "desarrollo-web" },
    modulo: { slug: "m2-css", titulo: "CSS" },
    comentarios,
    puedeDarPuntos: false,
  };
}

describe("FormularioDuda plegado", () => {
  it("cerrado: solo el botón «Nueva duda» con aria-expanded=false y sin campos", () => {
    const html = renderToStaticMarkup(
      <FormularioDuda abierto={false} onAbrir={vi.fn()} onCancelar={vi.fn()} enviando={false} error={null} onEnviar={vi.fn()} />,
    );
    expect(html).toMatch(/<button[^>]*aria-expanded="false"[^>]*>[\s\S]*Nueva duda/);
    expect(html).not.toMatch(/<input|<textarea/);
    expect(html).not.toContain("Publicar duda");
  });

  it("abierto: el formulario con «Publicar duda» (accent), «Cancelar» y entrada motion-safe", () => {
    const html = renderToStaticMarkup(
      <FormularioDuda abierto onAbrir={vi.fn()} onCancelar={vi.fn()} enviando={false} error={null} onEnviar={vi.fn()} />,
    );
    expect(html).toMatch(/<input/);
    expect(html).toMatch(/<textarea/);
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>[\s\S]*Publicar duda/);
    expect(html).toMatch(/<button[^>]*type="button"[^>]*>Cancelar</);
    expect(html).toContain("motion-safe:animate-in");
  });
});

describe("puntosGanados", () => {
  const antes = hilo([comentario({ id: "c-otro" })]);
  it("da los puntos de mi comentario nuevo cuando la IA lo puntúa", () => {
    const despues = hilo([
      comentario({ id: "c-otro" }),
      comentario({
        id: "c-mio",
        validacion: "correcta",
        puntos: 10,
        respuestas: [comentario({ id: "c-s", autor: SENSEI, respuestaAId: "c-mio" })],
      }),
    ]);
    expect(puntosGanados(antes, despues, "c-mio")).toBe(10);
  });

  it("encuentra mi comentario aunque sea una respuesta anidada", () => {
    const despues = hilo([comentario({ id: "c-otro", respuestas: [comentario({ id: "c-mio", respuestaAId: "c-otro", puntos: 5 })] })]);
    expect(puntosGanados(antes, despues, "c-mio")).toBe(5);
  });

  it("0 si aún está pendiente, si no suma o si no aparece", () => {
    expect(puntosGanados(antes, hilo([comentario({ id: "c-mio" })]), "c-mio")).toBe(0);
    expect(puntosGanados(antes, hilo([comentario({ id: "c-mio", validacion: "no_respuesta", puntos: 0 })]), "c-mio")).toBe(0);
    expect(puntosGanados(antes, hilo([]), "c-mio")).toBe(0);
  });

  it("0 si ya tenía esos puntos antes (no se celebra dos veces)", () => {
    const yaPuntuado = hilo([comentario({ id: "c-mio", puntos: 10 })]);
    expect(puntosGanados(yaPuntuado, yaPuntuado, "c-mio")).toBe(0);
  });
});

describe("Celebracion", () => {
  it("con puntos: «+10 puntos ganados» en píldora verde con texto carbón, anunciado", () => {
    const html = renderToStaticMarkup(<Celebracion puntos={10} />);
    expect(html).toContain("+10 puntos ganados");
    expect(html).toMatch(/role="status"[^>]*class="[^"]*bg-brand[^"]*text-surface-dark|class="[^"]*bg-brand[^"]*text-surface-dark[^"]*"[^>]*role="status"/);
  });

  it("con 0 puntos no muestra nada", () => {
    expect(renderToStaticMarkup(<Celebracion puntos={0} />)).toBe("");
  });

  it("el confeti es decorativo, no capta el ratón y solo se anima sin movimiento reducido", () => {
    const html = renderToStaticMarkup(<Confeti />);
    expect(html).toMatch(/^<div[^>]*aria-hidden="true"/);
    expect(html).toContain("pointer-events-none");
    expect(html).toContain("fixed");
    expect(html).toContain("motion-reduce:hidden");
    expect(html).toContain("motion-safe:animate-confeti");
    expect(html).toContain("bg-brand");
    expect(html).toContain("bg-chart-");
  });
});

describe("Esqueletos de carga", () => {
  it("lista: anuncia la carga y muestra bloques que laten solo con movimiento", () => {
    const html = renderToStaticMarkup(<EsqueletoTemas />);
    expect(html).toContain('role="status"');
    expect(html).toContain("Cargando las dudas…");
    expect(html).toContain('data-slot="skeleton"');
    expect(html).toContain("motion-safe:animate-pulse");
    expect(html).not.toMatch(/(?<!:)animate-pulse/);
  });

  it("hilo: anuncia la carga con esqueleto", () => {
    const html = renderToStaticMarkup(<EsqueletoHilo />);
    expect(html).toContain("Cargando el hilo…");
    expect(html).toContain('data-slot="skeleton"');
  });
});

describe("SeccionForo como sección aparte", () => {
  const html = renderToStaticMarkup(<SeccionForo cursoSlug="desarrollo-web" moduloSlug="m2-css" />);
  it("cambia de fondo, con una línea de degradado de marca arriba y altura estable", () => {
    expect(html).toMatch(/<section[^>]*id="foro"[^>]*class="[^"]*bg-muted/);
    expect(html).toMatch(/aria-hidden="true"[^>]*class="[^"]*bg-linear-to-r from-brand/);
    expect(html).toContain("min-h-");
  });
  it("mientras carga muestra el esqueleto de la lista y «Nueva duda» plegado", () => {
    expect(html).toContain('data-slot="skeleton"');
    expect(html).toMatch(/aria-expanded="false"[^>]*>[\s\S]*Nueva duda/);
  });
});
