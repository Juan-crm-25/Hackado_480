import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Carga .env.local solo para la prueba de conexión real (npm run test:ia).
    env: mode === "ia" ? loadEnv("development", process.cwd(), "") : {},
  },
}));
