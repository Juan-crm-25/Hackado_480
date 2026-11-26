import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { conversacionesDemo } from "@/lib/demo/mensajes";
import { estadoInicial, reducirBandeja } from "./bandeja";
import { BotonMensajesVista, ListaConversaciones, VistaConversacion } from "./bandeja-mensajes";

const ana = conversacionesDemo.find((c) => c.nombre === "Ana Torres")!;

describe("botón de mensajes de la barra superior", () => {
  it("tiene etiqueta accesible y el número de no leídos en texto", () => {
    const html = renderToStaticMarkup(<BotonMensajesVista noLeidos={2} onClick={() => {}} />);
    expect(html).toContain('aria-label="Mensajes, 2 sin leer"');
    expect(html).toMatch(/>2</);
  });

  it("sin no leídos no pinta el contador", () => {
    const html = renderToStaticMarkup(<BotonMensajesVista noLeidos={0} onClick={() => {}} />);
    expect(html).toContain('aria-label="Mensajes"');
    expect(html).not.toContain("sin leer");
  });
});

describe("bandeja de mensajes", () => {
  it("lista las conversaciones de ejemplo con su último mensaje y sus no leídos", () => {
    const html = renderToStaticMarkup(<ListaConversaciones conversaciones={conversacionesDemo} onAbrir={() => {}} />);
    for (const c of conversacionesDemo) {
      expect(html).toContain(c.nombre);
      expect(html).toContain(c.mensajes.at(-1)!.texto);
    }
    expect(html).toContain("sin leer");
  });

  it("al abrir una conversación muestra sus burbujas con la hora y la caja para escribir", () => {
    const html = renderToStaticMarkup(<VistaConversacion conversacion={ana} onVolver={() => {}} onEnviar={() => {}} />);
    for (const m of ana.mensajes) expect(html).toContain(m.texto);
    expect(html).toContain("<time");
    expect(html).toContain("<textarea");
    expect(html).toContain(">Enviar<");
  });

  it("un mensaje enviado aparece como mío con «Enviado»", () => {
    const e = reducirBandeja(estadoInicial(), {
      tipo: "enviar",
      id: ana.id,
      texto: "¿Hay tutoría el viernes?",
      mensajeId: "m1",
      hora: "2026-11-26T10:00:00.000Z",
    });
    const conversacion = e.conversaciones.find((c) => c.id === ana.id)!;
    const html = renderToStaticMarkup(<VistaConversacion conversacion={conversacion} onVolver={() => {}} onEnviar={() => {}} />);
    expect(html).toContain("¿Hay tutoría el viernes?");
    expect(html).toContain("Enviado");
    expect(html).toContain("Tú");
  });
});
