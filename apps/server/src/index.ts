import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { ConfigError, loadConfig } from "./config.js";
import { CybersourceClient } from "./cybersource-client.js";
import { loadRepoEnv } from "./env.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
loadRepoEnv(root);

let config: ReturnType<typeof loadConfig>;
try {
  config = loadConfig();
} catch (error) {
  const message = error instanceof ConfigError ? error.message : "Configuration is invalid.";
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const staticDir = path.resolve(root, "apps/web/dist");
const app = createApp({
  client: new CybersourceClient(config),
  environment: config.environment,
  staticDir: existsSync(staticDir) ? staticDir : undefined,
});

app.listen(config.port, () => {
  const line = JSON.stringify({
    level: "info",
    message: "listening",
    port: config.port,
    environment: config.environment,
  });
  process.stdout.write(`${line}\n`);
});
