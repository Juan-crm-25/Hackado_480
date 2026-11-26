import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { IntentoPago } from "@/lib/pagos";
import { FormularioPago } from "./formulario-pago";
import { PagoCompletado } from "./pago-completado";
import { ResumenPedido } from "./resumen-pedido";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const CURSO = { slug: "python-desde-cero", titulo: "Python desde cero", categoria: "Programación", numModulos: 3 };

describe("ResumenPedido", () => {
  it("muestra el curso, su precio de la BBDD y el total con IVA incluido", () => {
    const html = renderToStaticMarkup(<ResumenPedido curso={CURSO} precioCentimos={4900} />);
    expect(html).toContain("Python desde cero");
    expect(html).toContain("Programación");
    expect(html).toContain("3 módulos");
    expect(html).toMatch(/Total[\s\S]*49,00\s€/);
    expect(html).toContain("IVA incluido");
  });

  it("un curso gratis se muestra como «Gratis»", () => {
    expect(renderToStaticMarkup(<ResumenPedido curso={CURSO} precioCentimos={0} />)).toContain("Gratis");
  });
});

describe("FormularioPago", () => {
  const html = renderToStaticMarkup(<FormularioPago precioCentimos={4900} procesando={false} onPagar={vi.fn()} />);

  it("ofrece tarjeta, PayPal, Bizum y Apple Pay / Google Pay", () => {
    for (const metodo of ["Tarjeta", "PayPal", "Bizum", "Apple Pay / Google Pay"]) expect(html).toContain(metodo);
  });

  it("el método elegido lleva una marca de verificación, no solo color", () => {
    expect(html.match(/lucide-circle-check/g)).toHaveLength(1);
  });

  it("con tarjeta pide número, caducidad, CVC y titular con su autocompletado", () => {
    for (const ac of ["cc-number", "cc-exp", "cc-csc", "cc-name"]) expect(html).toMatch(new RegExp(`autocomplete="${ac}"`, "i"));
    expect(html).toContain("Número de la tarjeta");
    expect(html).toContain("Caducidad");
    expect(html).toContain("CVC");
  });

  it("el botón de pagar muestra el importe y avisa de que es una prueba", () => {
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>[\s\S]*Pagar 49,00\s€[\s\S]*<\/button>/);
    expect(html).toContain("Modo de prueba");
  });

  it("mientras procesa, el botón lo dice y se desactiva", () => {
    const procesando = renderToStaticMarkup(<FormularioPago precioCentimos={4900} procesando onPagar={vi.fn()} />);
    expect(procesando).toMatch(/<button[^>]*type="submit"[^>]*disabled[^>]*>[\s\S]*Procesando el pago…/);
  });

  it("un curso gratis no pide método de pago", () => {
    const gratis = renderToStaticMarkup(<FormularioPago precioCentimos={0} procesando={false} onPagar={vi.fn()} />);
    expect(gratis).toContain("Apuntarme gratis");
    expect(gratis).not.toContain("cc-number");
    expect(gratis).not.toContain("PayPal");
  });
});

describe("PagoCompletado", () => {
  const pago: IntentoPago = {
    id: "pi_test_abc",
    object: "payment_intent",
    amount: 4900,
    currency: "eur",
    status: "succeeded",
    payment_method_types: ["bizum"],
    created: 1764064800,
    pedido: { id: "7f3c2a10-0000-4000-8000-000000000000", pagadoEn: "2026-11-25T10:00:00.000Z" },
    curso: { slug: "python-desde-cero", titulo: "Python desde cero" },
  };
  const html = renderToStaticMarkup(<PagoCompletado pago={pago} />);

  it("confirma el pago con el recibo: curso, importe, método y número de pedido", () => {
    expect(html).toMatch(/<h1[^>]*>¡Pago completado!<\/h1>/);
    expect(html).toContain("Python desde cero");
    expect(html).toContain("49,00");
    expect(html).toContain("Bizum");
    expect(html).toContain("7F3C2A10");
  });

  it("invita a personalizar la ruta (acción destacada) o ir a «Tus cursos»", () => {
    const enlace = html.match(/<a[^>]*href="\/cursos\/python-desde-cero\/ruta"[^>]*>([^<]*)/);
    expect(enlace?.[0]).toContain("bg-brand");
    expect(enlace?.[1]).toContain("Personaliza tu ruta");
    expect(html).toContain('href="/dashboard/python-desde-cero"');
  });

  it("un curso gratis no habla de pago", () => {
    const gratis = renderToStaticMarkup(
      <PagoCompletado pago={{ ...pago, amount: 0, payment_method_types: ["gratis"] }} />,
    );
    expect(gratis).toMatch(/<h1[^>]*>¡Ya estás dentro!<\/h1>/);
    expect(gratis).not.toContain("Pago completado");
  });
});
