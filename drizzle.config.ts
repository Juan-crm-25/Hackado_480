import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit no lee .env.local por sí solo. En Vercel/CI la variable ya viene en el entorno.
if (!process.env.DATABASE_URL && existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
});
