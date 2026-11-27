import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Ficheros que el servidor lee al responder (con fs, no con import), así que Next.js no los
   * detecta solo. Sin esto, al desplegar (p. ej. en Vercel) el tutor y el material fallarían.
   */
  outputFileTracingIncludes: {
    "/*": [
      "./agents/**/*.md",
      "./data/transcripciones/**/*",
    ],
  },
  /*
   * Service worker de la PWA (public/sw.js), como en la guía de Next.js: el navegador nunca lo guarda
   * (así siempre recibe la última versión) y solo puede cargar código de la propia web.
   */
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
