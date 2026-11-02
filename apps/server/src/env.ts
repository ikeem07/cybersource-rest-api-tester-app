import path from "node:path";
import dotenv from "dotenv";

/** Shell variables win, then `.env.local`, then `.env`. Missing files are skipped. */
export function loadRepoEnv(root: string, target: NodeJS.ProcessEnv = process.env): void {
  const populated: Record<string, string> = {};
  for (const [key, value] of Object.entries(target)) {
    if (typeof value === "string") {
      populated[key] = value;
    }
  }
  dotenv.config({
    path: [path.join(root, ".env.local"), path.join(root, ".env")],
    processEnv: populated,
  });
  for (const [key, value] of Object.entries(populated)) {
    target[key] = value;
  }
}
