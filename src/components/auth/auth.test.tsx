import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FormularioLogin } from "./formulario-login";
import { FormularioRegistro } from "./formulario-registro";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams("volver=/perfil"),
}));

/** Etiquetas accesibles de los botones de Google, Apple y GitHub. */
const SOCIALES = ["Continuar con Google", "Continuar con Apple", "Continuar con GitHub"];

describe("FormularioLogin", () => {
  const html = renderToStaticMarkup(<FormularioLogin />);

  it("pide email y contraseña con sus etiquetas", () => {
    expect(html).toMatch(/<label[^>]*for="login-email"[^>]*>Email<\/label>/);
    expect(html).toMatch(/<input[^>]*type="email"[^>]*id="login-email"|<input[^>]*id="login-email"[^>]*type="email"/);
    expect(html).toMatch(/<label[^>]*for="login-contrasena"[^>]*>Contraseña<\/label>/);
    expect(html).toMatch(/id="login-contrasena"/);
    expect(html).toMatch(/autocomplete="current-password"/i);
  });

  it("tiene el botón de entrar como acción destacada", () => {
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>[\s\S]*Entrar[\s\S]*<\/button>/);
    expect(html).toContain("bg-brand");
  });

  it("muestra «¿Has olvidado tu contraseña?», que no lleva a ninguna parte", () => {
    expect(html).toContain("¿Has olvidado tu contraseña?");
    expect(html).not.toMatch(/href="[^"]*(recuperar|olvid)/);
  });

  it("muestra Google, Apple y GitHub como botones decorativos que no envían el formulario", () => {
    for (const etiqueta of SOCIALES) {
      expect(html).toMatch(new RegExp(`<button[^>]*type="button"[^>]*aria-label="${etiqueta}"`));
    }
  });

  it("enlaza al registro conservando a dónde volver", () => {
    expect(html).toContain("¿No tienes cuenta?");
    expect(html).toContain('href="/registro?volver=%2Fperfil"');
  });
});

describe("FormularioRegistro", () => {
  const html = renderToStaticMarkup(<FormularioRegistro />);

  it("pide nombre, email y una contraseña de al menos 8 caracteres", () => {
    expect(html).toMatch(/for="registro-nombre"[^>]*>Nombre<\/label>/);
    expect(html).toMatch(/for="registro-email"[^>]*>Email<\/label>/);
    expect(html).toMatch(/for="registro-contrasena"[^>]*>Contraseña<\/label>/);
    expect(html).toMatch(/id="registro-contrasena"[^>]*minLength="8"|minLength="8"[^>]*id="registro-contrasena"/);
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>[\s\S]*Crear cuenta[\s\S]*<\/button>/);
  });

  it("muestra los mismos botones decorativos y enlaza al login", () => {
    for (const etiqueta of SOCIALES) expect(html).toContain(`aria-label="${etiqueta}"`);
    expect(html).toContain("¿Ya tienes cuenta?");
    expect(html).toContain('href="/login?volver=%2Fperfil"');
  });
});
