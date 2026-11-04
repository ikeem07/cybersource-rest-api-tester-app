import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config.js";
import { CybersourceClient } from "../../src/cybersource-client.js";
import { loadRepoEnv } from "../../src/env.js";

const enabled = process.env.CYBERSOURCE_LIVE_TESTS === "true";

describe.skipIf(!enabled)("sandbox smoke", () => {
  it("runs a read-only transaction search when credentials are configured", async () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
    loadRepoEnv(root);
    const config = loadConfig();
    const client = new CybersourceClient(config);
    const result = await client.search({
      save: false,
      name: "Transaction search",
      timezone: "America/New_York",
      query: `submitTimeUtc:[NOW/DAY-1DAY TO NOW/DAY+1DAY} AND clientReferenceInformation.code:${config.merchantReferencePrefix}*`,
      offset: 0,
      limit: 1,
      sort: "submitTimeUtc:desc",
    });
    expect(result.status).toBeGreaterThanOrEqual(200);
    expect(result.status).toBeLessThan(300);
    expect(result.data).toBeTypeOf("object");

    const requestId = process.env.CYBERSOURCE_SMOKE_REQUEST_ID?.trim();
    if (requestId) {
      const details = await client.getTransaction(requestId);
      expect(details.status).toBe(200);
    }
  }, 180_000);
});
