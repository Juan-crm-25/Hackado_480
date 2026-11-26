import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AutorForo, ComentarioHilo, HiloForo, TemaResumen } from "@/server/foro/servicio";
import { FormularioDuda } from "./formulario-duda";
import { IrAlForo } from "./ir-al-foro";
import { ListaTemas } from "./lista-temas";
import { PuntosForo } from "./puntos-foro";
import { SeccionForo } from "./seccion-foro";
import { VistaHilo, type AccionesHilo } from "./vista-hilo";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const ANA: AutorForo = { id: "u-ana", nombre: "Ana Pérez", imagenUrl: null, esIa: false, esProfesor: false };
const LUIS: AutorForo = { id: "u-luis", nombre: "Luis Gil", imagenUrl: null, esIa: false, esProfesor: false };
const SENSEI: AutorForo = { id: "u-sensei", nombre: "Sensei", imagenUrl: "/avatars/sensei.svg", esIa: true, esProfesor: false };
const PROFE: AutorForo = { id: "u-profe", nombre: "Marta Ruiz", imagenUrl: null, esIa: false, esProfesor: true };

function comentario(datos: Partial<ComentarioHilo> & Pick<ComentarioHilo, "id" | "cuerpo" | "autor">): ComentarioHilo {
  return {
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

const RESPUESTA_LUIS = comentario({
  id: "c-luis",
  cuerpo: "Se usa display: flex en el contenedor.",
  autor: LUIS,
  validacion: "correcta",
  validadoPor: "ia",
  puntos: 10,
  puntosProfesor: { puntos: 3, motivo: "buena_conducta" },
  respuestas: [
    comentario({
      id: "c-sensei",
      respuestaAId: "c-luis",
      cuerpo: "¡Genial, tú sí que sabes del tema!",
      autor: SENSEI,
      respuestas: [comentario({ id: "c-ana", respuestaAId: "c-sensei", cuerpo: "¡Gracias a los dos!", autor: ANA })],
    }),
  ],
});

const PROFE_COMENTA = comentario({ id: "c-profe", cuerpo: "Mirad también grid.", autor: PROFE });

function hilo(puedeDarPuntos: boolean, comentarios: ComentarioHilo[] = [RESPUESTA_LUIS, PROFE_COMENTA]): HiloForo {
  return {
    tema: {
      id: "t-1",
      titulo: "¿Cómo centro un div?",
      cuerpo: "No consigo centrarlo en vertical.",
      creado: "2026-11-20T09:00:00.000Z",
      autor: ANA,
      puntosProfesor: { puntos: 1, motivo: "buena_pregunta" },
    },
    curso: { slug: "desarrollo-web" },
    modulo: { slug: "m2-css", titulo: "CSS" },
    comentarios,
    puedeDarPuntos,
  };
}

const ACCIONES: AccionesHilo = {
  responder: vi.fn(),
  validar: vi.fn(),
  darPuntos: vi.fn(),
  quitarPuntos: vi.fn(),
};

describe("IrAlForo", () => {
  it("es un enlace que baja hasta el foro (#foro)", () => {
    const html = renderToStaticMarkup(<IrAlForo />);
    expect(html).toMatch(/<a[^>]*href="#foro"[^>]*>[\s\S]*Ir al foro[\s\S]*<\/a>/);
  });
});

describe("SeccionForo", () => {
  it("es la sección con id «foro» y su título", () => {
    const html = renderToStaticMarkup(<SeccionForo cursoSlug="desarrollo-web" moduloSlug="m2-css" />);
    expect(html).toMatch(/<section[^>]*id="foro"/);
    expect(html).toContain("Foro del módulo");
    expect(html).toContain("Cargando las dudas…");
  });
});

describe("ListaTemas", () => {
  const temas: TemaResumen[] = [
    { id: "t-2", titulo: "¿Qué es el box model?", cuerpo: "…", creado: "2026-11-21T09:00:00.000Z", autor: LUIS, comentarios: 0, puntosProfesor: null },
    {
      id: "t-1",
      titulo: "¿Cómo centro un div?",
      cuerpo: "…",
      creado: "2026-11-20T09:00:00.000Z",
      autor: ANA,
      comentarios: 3,
      puntosProfesor: { puntos: 6, motivo: "buena_pregunta" },
    },
  ];
  const html = renderToStaticMarkup(<ListaTemas temas={temas} onAbrir={vi.fn()} />);

  it("muestra título, autor y número de comentarios de cada duda, en el orden recibido", () => {
    expect(html.indexOf("¿Qué es el box model?")).toBeLessThan(html.indexOf("¿Cómo centro un div?"));
    expect(html).toContain("Ana Pérez");
    expect(html).toContain("3 comentarios");
    expect(html).toContain("Sin comentarios");
  });

  it("muestra los puntos del profesor con su motivo", () => {
    expect(html).toContain("+6 · Buena pregunta");
  });

  it("sin dudas, lo dice", () => {
    expect(renderToStaticMarkup(<ListaTemas temas={[]} onAbrir={vi.fn()} />)).toContain("Todavía no hay dudas en este módulo");
  });
});

describe("FormularioDuda", () => {
  it("pide título y texto y tiene el botón de publicar", () => {
    const html = renderToStaticMarkup(<FormularioDuda enviando={false} error={null} onEnviar={vi.fn()} />);
    expect(html).toContain("Título");
    expect(html).toMatch(/<textarea/);
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>[\s\S]*Publicar duda/);
  });

  it("mientras envía, el botón lo dice y se desactiva; los errores se ven", () => {
    const html = renderToStaticMarkup(<FormularioDuda enviando error="Escribe tu duda" onEnviar={vi.fn()} />);
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled[^>]*>[\s\S]*Publicando…/);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Escribe tu duda");
  });
});

describe("VistaHilo", () => {
  const alumno = renderToStaticMarkup(<VistaHilo hilo={hilo(false)} acciones={ACCIONES} />);
  const profesor = renderToStaticMarkup(<VistaHilo hilo={hilo(true)} acciones={ACCIONES} />);

  it("muestra la duda con su autor", () => {
    expect(alumno).toContain("¿Cómo centro un div?");
    expect(alumno).toContain("No consigo centrarlo en vertical.");
    expect(alumno).toContain("Ana Pérez");
  });

  it("el comentario de Sensei lleva su avatar, su nombre, la insignia «IA» y su frase", () => {
    expect(alumno).toContain("/avatars/sensei.svg");
    expect(alumno).toMatch(/>Sensei</);
    expect(alumno).toMatch(/>IA</);
    expect(alumno).toContain("¡Genial, tú sí que sabes del tema!");
  });

  it("la respuesta valorada muestra sus puntos en texto", () => {
    expect(alumno).toContain("+10 puntos");
  });

  it("los comentarios sin puntos no llevan insignia de puntos", () => {
    const sinPuntos = renderToStaticMarkup(<VistaHilo hilo={hilo(false, [PROFE_COMENTA])} acciones={ACCIONES} />);
    expect(sinPuntos).not.toMatch(/\+\d+ puntos/);
  });

  it("una respuesta aproximada muestra +5 puntos", () => {
    const aprox = comentario({ id: "c-x", cuerpo: "Con margin auto.", autor: LUIS, validacion: "aproximada", validadoPor: "ia", puntos: 5 });
    expect(renderToStaticMarkup(<VistaHilo hilo={hilo(false, [aprox])} acciones={ACCIONES} />)).toContain("+5 puntos");
  });

  it("muestra los puntos del profesor con su motivo", () => {
    expect(alumno).toContain("+3 · Buena conducta");
    expect(alumno).toContain("+1 · Buena pregunta");
  });

  it("las respuestas van anidadas dentro del comentario al que responden", () => {
    const luis = alumno.indexOf("Se usa display: flex");
    const sensei = alumno.indexOf("¡Genial, tú sí que sabes del tema!");
    const ana = alumno.indexOf("¡Gracias a los dos!");
    expect(luis).toBeGreaterThan(-1);
    expect(sensei).toBeGreaterThan(luis);
    expect(ana).toBeGreaterThan(sensei);
    // Tres listas de respuestas anidadas: la raíz, las de Luis y las de Sensei.
    expect(alumno.match(/aria-label="Respuestas a /g)?.length).toBe(2);
  });

  it("cada comentario tiene «Responder» salvo los de Sensei (S11), y hay caja para comentar", () => {
    // Luis, Ana y la profesora: sí; Sensei: no.
    expect(alumno.match(/>Responder</g)?.length).toBe(3);
    expect(alumno).toContain("Tu comentario");
  });

  it("a Sensei no se le puede responder; a un alumno sí (S11)", () => {
    const sensei = comentario({ id: "c-s", cuerpo: "¡Me gusta cómo piensas!", autor: SENSEI });
    const html = renderToStaticMarkup(<VistaHilo hilo={hilo(false, [sensei])} acciones={ACCIONES} />);
    expect(html).toContain("¡Me gusta cómo piensas!");
    expect(html).not.toMatch(/>Responder</);
    const deAlumno = renderToStaticMarkup(<VistaHilo hilo={hilo(false, [comentario({ id: "c-l", cuerpo: "Hola", autor: LUIS })])} acciones={ACCIONES} />);
    expect(deAlumno.match(/>Responder</g)?.length).toBe(1);
  });

  it("el alumno no ve los controles del profesor", () => {
    expect(alumno).not.toContain("Dar +1");
    expect(alumno).not.toContain("Valoración");
    expect(alumno).not.toContain("Pendiente de revisar");
  });

  it("el profesor ve +1, +3 y +6 con el motivo en el tema y en los comentarios de alumnos", () => {
    for (const p of [1, 3, 6]) expect(profesor).toContain(`Dar +${p}`);
    expect(profesor).toContain("Buena pregunta");
    expect(profesor).toContain("Buena conducta");
    // Tema + comentario de Luis + comentario de Ana; no en Sensei ni en el profesor.
    expect(profesor.match(/Dar \+6/g)?.length).toBe(3);
  });

  it("el profesor puede quitar los puntos que ya dio", () => {
    expect(profesor).toContain("Quitar puntos");
  });

  it("el profesor puede valorar las respuestas de los alumnos y ve las pendientes", () => {
    expect(profesor.match(/Valoración/g)?.length).toBeGreaterThanOrEqual(2);
    expect(profesor).toContain("Pendiente de revisar");
  });
});

describe("PuntosForo", () => {
  it("muestra el total y el desglose", () => {
    const html = renderToStaticMarkup(<PuntosForo puntos={{ total: 18, respuestas: 15, profesor: 3 }} />);
    expect(html).toContain("Puntos del foro");
    expect(html).toContain("18");
    expect(html).toContain("15 por tus respuestas");
    expect(html).toContain("3 del profesor");
  });
});
