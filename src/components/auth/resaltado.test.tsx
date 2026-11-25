import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Resaltado } from "./resaltado";

describe("Resaltado", () => {
  const html = renderToStaticMarkup(<Resaltado>hablar con tu tutor.</Resaltado>);

  it("muestra el texto", () => {
    expect(html).toContain("hablar con tu tutor.");
  });

  it("lo subraya como un rotulador verde claro, también si ocupa dos líneas", () => {
    expect(html).toContain("from-brand/40");
    expect(html).toContain("box-decoration-clone");
  });
});
