import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      // Mismo alias que tsconfig.json ("@/*" → "./src/*").
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // "server-only" lanza un error fuera del bundler de React Server Components.
      // En los tests se usa su módulo vacío (el mismo que Next carga en el servidor).
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Carga .env.local solo para la prueba de conexión real (npm run test:ia).
    env: mode === "ia" ? loadEnv("development", process.cwd(), "") : {},
  },
}));
