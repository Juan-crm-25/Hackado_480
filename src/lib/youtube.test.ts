import { describe, expect, it } from "vitest";
import {
  duracionAccesible,
  duracionVideo,
  embedYoutube,
  idDeYoutube,
  leerMensajeYoutube,
  miniaturaYoutube,
} from "./youtube";

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

describe("embedYoutube con origen (API del reproductor)", () => {
  it("activa enablejsapi y el origen de la página para recibir los mensajes del reproductor", () => {
    expect(embedYoutube("81u19umYU_E", "http://localhost:3000")).toBe(
      "https://www.youtube-nocookie.com/embed/81u19umYU_E?autoplay=1&enablejsapi=1&origin=http%3A%2F%2Flocalhost%3A3000",
    );
  });
});

describe("leerMensajeYoutube", () => {
  const NOCOOKIE = "https://www.youtube-nocookie.com";

  it("lee el estado de un infoDelivery, como texto JSON o como objeto", () => {
    const datos = { event: "infoDelivery", info: { playerState: 1, currentTime: 3.2 } };
    expect(leerMensajeYoutube(NOCOOKIE, JSON.stringify(datos))).toEqual({ estadoReproductor: 1 });
    expect(leerMensajeYoutube("https://www.youtube.com", datos)).toEqual({ estadoReproductor: 1 });
  });

  it("lee el estado de un onStateChange", () => {
    expect(leerMensajeYoutube(NOCOOKIE, '{"event":"onStateChange","info":2}')).toEqual({ estadoReproductor: 2 });
  });

  it("ignora otros orígenes, otros eventos y datos que no son JSON", () => {
    const datos = '{"event":"infoDelivery","info":{"playerState":1}}';
    expect(leerMensajeYoutube("https://evil.example", datos)).toBeNull();
    expect(leerMensajeYoutube(NOCOOKIE, '{"event":"onReady","info":null}')).toBeNull();
    expect(leerMensajeYoutube(NOCOOKIE, '{"event":"infoDelivery","info":{"currentTime":4}}')).toBeNull();
    expect(leerMensajeYoutube(NOCOOKIE, "no es json")).toBeNull();
    expect(leerMensajeYoutube(NOCOOKIE, null)).toBeNull();
    expect(leerMensajeYoutube(NOCOOKIE, 42)).toBeNull();
  });
});
