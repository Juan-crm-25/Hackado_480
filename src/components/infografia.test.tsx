import { describe, expect, it } from "vitest";
import { claseAnchoJerarquia } from "./infografia";

describe("claseAnchoJerarquia", () => {
  it("el primer nivel ocupa todo el ancho y el último la mitad", () => {
    expect(claseAnchoJerarquia(0, 4)).toBe("w-full");
    expect(claseAnchoJerarquia(3, 4)).toBe("w-1/2");
  });

  it("los niveles intermedios se acortan poco a poco", () => {
    expect(claseAnchoJerarquia(1, 3)).toBe("w-3/4");
    expect(claseAnchoJerarquia(1, 4)).toBe("w-5/6");
    expect(claseAnchoJerarquia(2, 4)).toBe("w-2/3");
  });

  it("con un solo elemento ocupa todo el ancho", () => {
    expect(claseAnchoJerarquia(0, 1)).toBe("w-full");
  });
});
