import { describe, expect, it } from "vitest";
import { franjaDeCategoria, porcentaje, textoEstudiantes, textoModulos, textoValoraciones } from "./textos";

describe("textos de las tarjetas de curso", () => {
  it("usa singular y plural", () => {
    expect(textoEstudiantes(1)).toBe("1 estudiante");
    expect(textoEstudiantes(10)).toBe("10 estudiantes");
    expect(textoEstudiantes(0)).toBe("0 estudiantes");
    expect(textoValoraciones(1)).toBe("1 valoración");
    expect(textoValoraciones(5)).toBe("5 valoraciones");
    expect(textoModulos(1)).toBe("1 módulo");
    expect(textoModulos(3)).toBe("3 módulos");
  });

  it("da a cada categoría su franja de color y una por defecto a las desconocidas", () => {
    expect(franjaDeCategoria("programacion")).toBe("bg-chart-1");
    expect(franjaDeCategoria("cocina")).toBe("bg-chart-3");
    expect(franjaDeCategoria("otra")).toMatch(/^bg-chart-\d$/);
  });

  it("calcula el porcentaje entero de una barra, 0 sin total", () => {
    expect(porcentaje(3, 5)).toBe(60);
    expect(porcentaje(1, 3)).toBe(33);
    expect(porcentaje(0, 0)).toBe(0);
  });
});
