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
      "./data/material/**/*",
      "./data/infografias/**/*",
    ],
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
