import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IrAlForo } from "@/components/foro/ir-al-foro";

describe("IrAlForo", () => {
  it("es el botón verde (accent: relleno verde, texto carbón) que baja a #foro", () => {
    const html = renderToStaticMarkup(<IrAlForo />);
    expect(html).toMatch(/<a href="#foro" class="[^"]*bg-brand text-surface-dark[^"]*"/);
    expect(html).not.toContain("border-border bg-background");
    expect(html).toContain("Ir al foro");
  });
});
