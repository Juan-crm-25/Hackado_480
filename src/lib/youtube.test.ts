import { describe, expect, it } from "vitest";
import { duracionAccesible, duracionVideo, embedYoutube, idDeYoutube, miniaturaYoutube } from "./youtube";

describe("idDeYoutube", () => {
  it("saca el id de un enlace watch?v=", () => {
    expect(idDeYoutube("https://www.youtube.com/watch?v=81u19umYU_E")).toBe("81u19umYU_E");
    expect(idDeYoutube("https://youtube.com/watch?t=10&v=_MTZx8H-Fo4")).toBe("_MTZx8H-Fo4");
  });

  it("saca el id de un enlace corto youtu.be", () => {
    expect(idDeYoutube("https://youtu.be/FeXpLU515AI")).toBe("FeXpLU515AI");
    expect(idDeYoutube("https://youtu.be/FeXpLU515AI?t=30")).toBe("FeXpLU515AI");
  });

  it("devuelve null si el enlace no es de YouTube o no trae un id válido", () => {
    expect(idDeYoutube("")).toBeNull();
    expect(idDeYoutube("no es una url")).toBeNull();
    expect(idDeYoutube("https://vimeo.com/watch?v=81u19umYU_E")).toBeNull();
    expect(idDeYoutube("https://www.youtube.com/watch")).toBeNull();
    expect(idDeYoutube("https://www.youtube.com/watch?v=<script>")).toBeNull();
  });
});

describe("miniaturaYoutube y embedYoutube", () => {
  it("construyen la miniatura y el reproductor sin cookies", () => {
    expect(miniaturaYoutube("81u19umYU_E")).toBe("https://i.ytimg.com/vi/81u19umYU_E/hqdefault.jpg");
    expect(embedYoutube("81u19umYU_E")).toBe("https://www.youtube-nocookie.com/embed/81u19umYU_E?autoplay=1");
  });
});

describe("duraciones", () => {
  it("da la duración en mm:ss", () => {
    expect(duracionVideo(403)).toBe("6:43");
    expect(duracionVideo(59)).toBe("0:59");
    expect(duracionVideo(600)).toBe("10:00");
  });

  it("da la duración en palabras para lectores de pantalla", () => {
    expect(duracionAccesible(403)).toBe("6 min 43 s");
    expect(duracionAccesible(600)).toBe("10 min");
    expect(duracionAccesible(45)).toBe("45 s");
  });
});
