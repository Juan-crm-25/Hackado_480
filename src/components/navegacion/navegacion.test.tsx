import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

import { AccesoUsuario, AvatarUsuario, iniciales } from "./avatar-usuario";
import { BarraInferior } from "./barra-inferior";
import { BarraLateral } from "./barra-lateral";
import { BarraSuperior } from "./barra-superior";
import { destinosPrincipales, destinosSecundarios } from "./destinos";
import { ListaSecundarios } from "./menu-mas";
import { ContenidoCreditos } from "./creditos";

/** Ids de los destinos pintados (data-destino), en orden. */
function destinosPintados(html: string): string[] {
  return [...html.matchAll(/data-destino="([^"]+)"/g)].map((m) => m[1]);
}

/** Atributos del elemento que lleva data-destino="id". */
function elemento(html: string, id: string): string {
  const etiqueta = html.match(new RegExp(`<[^>]*data-destino="${id}"[^>]*>`));
  if (!etiqueta) throw new Error(`No se pinta el destino ${id}`);
  return etiqueta[0];
}

const principales = destinosPrincipales.map((d) => d.id);
const secundarios = destinosSecundarios.map((d) => d.id);

describe("barra lateral (web)", () => {
  it("pinta exactamente los destinos principales y luego los secundarios", () => {
    const html = renderToStaticMarkup(<BarraLateral pathname="/" />);
    expect(destinosPintados(html)).toEqual([...principales, ...secundarios]);
  });

  it("marca solo el destino activo con aria-current", () => {
    const html = renderToStaticMarkup(<BarraLateral pathname="/perfil" />);
    expect(elemento(html, "perfil")).toContain('aria-current="page"');
    expect(elemento(html, "inicio")).not.toContain("aria-current");
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it("lleva la marca, que enlaza con la home pública", () => {
    const html = renderToStaticMarkup(<BarraLateral pathname="/" />);
    // La marca (<Marca />) se lee «480 Academy» y sus palabras rotan (data-rotacion); su enlace va a la home pública.
    expect(html).toMatch(/<a[^>]*href="\/"[^>]*>(?:(?!<\/a>).)*480 Academy(?:(?!<\/a>).)*data-rotacion/);
  });

  it("en web el perfil también está en la barra lateral", () => {
    expect(destinosPintados(renderToStaticMarkup(<BarraLateral pathname="/" />))).toContain("perfil");
  });

  it("en /dashboard marca «Tus cursos»", () => {
    const html = renderToStaticMarkup(<BarraLateral pathname="/dashboard" />);
    expect(elemento(html, "cursos")).toContain('aria-current="page"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });
});

describe("barra inferior (móvil)", () => {
  it("pinta los destinos principales y el botón Más, 4 en total", () => {
    const html = renderToStaticMarkup(<BarraInferior pathname="/" />);
    expect(destinosPintados(html)).toEqual(principales);
    expect(principales).toEqual(["inicio", "cursos", "tutor"]);
    expect(html).toContain(">Más<");
  });

  it("marca el destino activo con aria-current", () => {
    const html = renderToStaticMarkup(<BarraInferior pathname="/tutor" />);
    expect(elemento(html, "tutor")).toContain('aria-current="page"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it("sin ruta conocida no marca ninguno", () => {
    expect(renderToStaticMarkup(<BarraInferior pathname={null} />)).not.toContain("aria-current");
  });
});

describe("menú Más", () => {
  it("pinta exactamente los destinos secundarios, con el perfil el primero", () => {
    const html = renderToStaticMarkup(<ListaSecundarios pathname="/contacto" />);
    expect(destinosPintados(html)).toEqual(secundarios);
    expect(secundarios[0]).toBe("perfil");
    expect(elemento(html, "contacto")).toContain('aria-current="page"');
    expect(html).toContain("Cerrar sesión");
  });
});

describe("avatar del usuario", () => {
  it("saca las iniciales del nombre", () => {
    expect(iniciales("Lucía Martín")).toBe("LM");
    expect(iniciales("pablo")).toBe("P");
    expect(iniciales("  Ana  María  López ")).toBe("AL");
  });

  it("lleva al perfil con su etiqueta accesible", () => {
    const html = renderToStaticMarkup(<AvatarUsuario nombre="Lucía Martín" />);
    expect(html).toContain('aria-label="Tu perfil"');
    expect(html).toContain('href="/perfil"');
    expect(html).toContain("LM");
  });
});

describe("acceso del usuario en la barra superior", () => {
  it("con sesión muestra su avatar, que lleva al perfil", () => {
    const html = renderToStaticMarkup(<AccesoUsuario nombre="Lucía Martín" />);
    expect(html).toContain('href="/perfil"');
    expect(html).toContain("LM");
    expect(html).not.toContain("Entrar");
  });

  it("con sesión muestra el icono de mensajes junto al avatar, con los no leídos en texto", () => {
    const html = renderToStaticMarkup(<AccesoUsuario nombre="Lucía Martín" />);
    expect(html).toMatch(/aria-label="Mensajes, \d+ sin leer"/);
  });

  it("sin sesión no hay icono de mensajes", () => {
    expect(renderToStaticMarkup(<AccesoUsuario nombre={null} />)).not.toContain("Mensajes");
  });

  it("sin sesión muestra «Entrar», que lleva al login", () => {
    const html = renderToStaticMarkup(<AccesoUsuario nombre={null} />);
    expect(html).toMatch(/<a[^>]*href="\/login"[^>]*>Entrar<\/a>/);
    expect(html).not.toContain('href="/perfil"');
  });
});

describe("posición de la marca", () => {
  const enlaceMarca = (html: string) => html.match(/<a[^>]*href="\/"[^>]*>(?=(?:(?!<\/a>).)*data-rotacion)/)?.[0] ?? "";

  it("en móvil va centrada en la barra superior, con el usuario a la derecha", () => {
    const html = renderToStaticMarkup(<BarraSuperior usuario={<span data-usuario />} />);
    const cabecera = html.match(/<header[^>]*>/)?.[0] ?? "";
    expect(cabecera).toContain("grid-cols-[1fr_auto_1fr]");
    expect(enlaceMarca(html)).toContain("justify-self-center");
    expect(html).toMatch(/<div[^>]*justify-self-end[^>]*><span data-usuario/);
  });

  it("en web va centrada en la columna de la barra lateral y algo más grande", () => {
    const enlace = enlaceMarca(renderToStaticMarkup(<BarraLateral pathname="/" />));
    expect(enlace).toContain("justify-center");
    expect(enlace).toContain("text-2xl");
  });
});


describe("Radar en la navegación (solo profesores y admin)", () => {
  it("la barra lateral lo pinta para la profesora y no para el alumno", () => {
    expect(destinosPintados(renderToStaticMarkup(<BarraLateral pathname="/" rol="profesor" />))).toContain("radar");
    expect(destinosPintados(renderToStaticMarkup(<BarraLateral pathname="/" rol="alumno" />))).not.toContain("radar");
    expect(destinosPintados(renderToStaticMarkup(<BarraLateral pathname="/" />))).not.toContain("radar");
  });

  it("el menú «Más» del móvil también, para que no se esconda en ningún tamaño", () => {
    expect(destinosPintados(renderToStaticMarkup(<ListaSecundarios pathname="/" rol="admin" />))).toContain("radar");
    expect(destinosPintados(renderToStaticMarkup(<ListaSecundarios pathname="/" rol="alumno" />))).not.toContain("radar");
  });
});

/** <li> que contiene el destino id. */
function itemDe(html: string, id: string): string {
  const li = html.match(new RegExp(`<li[^>]*>(?:(?!</li>).)*data-destino="${id}"`));
  if (!li) throw new Error(`No se pinta el destino ${id}`);
  return li[0];
}

describe("«Cerrar sesión» sin sesión", () => {
  it("en la barra lateral conserva su hueco pero no se ve ni se puede pulsar", () => {
    const sinSesion = renderToStaticMarkup(<BarraLateral pathname="/" />);
    expect(itemDe(sinSesion, "cerrar-sesion")).toMatch(/<li[^>]*class="[^"]*\binvisible\b/);
    const conSesion = renderToStaticMarkup(<BarraLateral pathname="/" rol="alumno" />);
    expect(itemDe(conSesion, "cerrar-sesion")).not.toContain("invisible");
  });

  it("en el menú «Más» igual", () => {
    expect(itemDe(renderToStaticMarkup(<ListaSecundarios pathname="/" />), "cerrar-sesion")).toMatch(/\binvisible\b/);
    expect(itemDe(renderToStaticMarkup(<ListaSecundarios pathname="/" rol="alumno" />), "cerrar-sesion")).not.toContain("invisible");
  });

  it("los demás destinos se ven siempre", () => {
    expect(itemDe(renderToStaticMarkup(<BarraLateral pathname="/" />), "contacto")).not.toContain("invisible");
  });
});

describe("créditos", () => {
  it("un botón «Créditos» pequeño debajo de «Cerrar sesión», en la barra lateral y en el menú «Más», con o sin sesión", () => {
    for (const html of [
      renderToStaticMarkup(<BarraLateral pathname="/" />),
      renderToStaticMarkup(<ListaSecundarios pathname="/" rol="alumno" />),
    ]) {
      const boton = html.match(/<button[^>]*data-accion="creditos"[^>]*>/)?.[0] ?? "";
      expect(boton).toContain("text-xs");
      expect(html.indexOf('data-accion="creditos"')).toBeGreaterThan(html.indexOf('data-destino="cerrar-sesion"'));
      expect(html).toContain("Créditos");
    }
  });

  it("agradece el material y nombra a sus autores, con la atribución del astronauta tal como la pide Magnific", () => {
    const html = renderToStaticMarkup(<ContenidoCreditos />);
    expect(html).toContain(
      'href="https://www.magnific.com/es/vector-gratis/lindo-astronauta-montando-cohete-agitando-mano-icono-dibujos-animados-ilustracion-concepto-icono-tecnologia-ciencia_10764053.htm#fromView=search&amp;page=1&amp;position=0&amp;uuid=0386de25-b20c-445a-b6d3-d8d185e2898c&amp;track=ais_hybrid&amp;query=Astronauta+svg"',
    );
    expect(html).toContain("Imagen de catalyststuff en Magnific");
    // La imagen del premio de las preguntas, con la atribución que pide Magnific.
    expect(html).toContain(
      'href="https://www.magnific.com/es/vector-gratis/plantilla-signo-pregunta-diseno-burbuja-chat_416708398.htm#fromView=keyword&amp;page=1&amp;position=0&amp;uuid=b2cc1284-4f2a-438b-8e69-02d45af924b4&amp;track=ais_hybrid&amp;query=Preguntas"',
    );
    expect(html).toContain("Imagen de starline en Magnific");
    // Los tres astronautas son del mismo autor.
    expect(html).toMatch(/astronauta[^<]*cohete[^<]*cohetes[^<]*cocinero|cohete[^<]*cohetes[^<]*cocinero/);
    for (const autor of ["Kiko Palomares", "Dorian Desings", "Lucide", "Simple Icons"]) expect(html).toContain(autor);
  });
});
