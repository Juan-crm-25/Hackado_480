import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VideoYoutube } from "./video-youtube";

describe("VideoYoutube", () => {
  it("al principio solo muestra la miniatura y un botón accesible para reproducir, sin iframe", () => {
    const html = renderToStaticMarkup(<VideoYoutube youtubeId="81u19umYU_E" titulo="Cómo están hechas las páginas web" />);

    expect(html).toContain('src="https://i.ytimg.com/vi/81u19umYU_E/hqdefault.jpg"');
    expect(html).toMatch(/<img[^>]*alt=""/);
    expect(html).toMatch(/<button[^>]*type="button"/);
    expect(html).toContain('aria-label="Reproducir: Cómo están hechas las páginas web"');
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("youtube-nocookie.com");
  });
});
