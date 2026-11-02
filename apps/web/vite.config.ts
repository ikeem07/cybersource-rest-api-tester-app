import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(root, "../..");
for (const name of [".env.local", ".env"]) {
  const file = path.join(repoRoot, name);
  if (existsSync(file)) {
    process.loadEnvFile(file);
  }
}
const apiPort = process.env.PORT ?? "3000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@cybersource-tester/domain": path.resolve(root, "../../packages/domain/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": `http://127.0.0.1:${apiPort}`,
    },
  },
});
