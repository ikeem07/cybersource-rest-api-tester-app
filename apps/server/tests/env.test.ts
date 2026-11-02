import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadRepoEnv } from "../src/env.js";

function writeEnv(root: string, name: string, contents: string) {
  writeFileSync(path.join(root, name), contents);
}

describe("loadRepoEnv", () => {
  it("lets .env.local override .env without replacing variables already set", () => {
    const root = mkdtempSync(path.join(tmpdir(), "cybersource-env-"));
    writeEnv(root, ".env", "FROM_FILE=shared\nONLY_SHARED=1\nALREADY=from-shared\n");
    writeEnv(root, ".env.local", "FROM_FILE=local\nONLY_LOCAL=1\nALREADY=from-local\n");
    const target: NodeJS.ProcessEnv = { ALREADY: "shell" };

    loadRepoEnv(root, target);

    expect(target.FROM_FILE).toBe("local");
    expect(target.ONLY_SHARED).toBe("1");
    expect(target.ONLY_LOCAL).toBe("1");
    expect(target.ALREADY).toBe("shell");
  });

  it("loads .env when .env.local is absent", () => {
    const root = mkdtempSync(path.join(tmpdir(), "cybersource-env-"));
    writeEnv(root, ".env", "ONLY_SHARED=1\n");
    const target: NodeJS.ProcessEnv = {};

    loadRepoEnv(root, target);

    expect(target.ONLY_SHARED).toBe("1");
  });
});
