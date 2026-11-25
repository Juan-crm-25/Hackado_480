import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AppLayout from "./layout";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/" }));
vi.mock("@/server/auth/usuario-actual", () => ({ obtenerUsuarioActual: vi.fn(async () => null) }));

describe("marco de la app", () => {
  it("el contenido es el único que se desplaza y contiene a sus elementos absolutos (sin una segunda barra de scroll)", () => {
    const html = renderToStaticMarkup(<AppLayout>contenido</AppLayout>);
    const contenido = html.match(/<div[^>]*id="contenido"[^>]*>/)?.[0] ?? "";
    expect(contenido).toContain("overflow-y-auto");
    // Sin «relative», los textos sr-only (position: absolute) del contenido estiran la página y sale otra barra.
    expect(contenido).toMatch(/\brelative\b/);
  });
});
