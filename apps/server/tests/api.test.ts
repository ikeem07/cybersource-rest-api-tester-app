import { readFileSync, readdirSync, statSync } from "node:fs";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Express } from "express";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";
import { CybersourceClient, UpstreamError } from "../src/cybersource-client.js";
import type { CybersourceGateway, CybersourceResult } from "../src/cybersource-client.js";

const fixtures = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../fixtures");
const searchFixture = JSON.parse(
  readFileSync(path.join(fixtures, "transaction-search.illustrative.json"), "utf8"),
) as unknown;
const emptyFixture = JSON.parse(
  readFileSync(path.join(fixtures, "transaction-search-empty.illustrative.json"), "utf8"),
) as unknown;
const detailsFixture = JSON.parse(
  readFileSync(path.join(fixtures, "transaction-details.illustrative.json"), "utf8"),
) as unknown;
const minimalFixture = JSON.parse(
  readFileSync(path.join(fixtures, "transaction-details-minimal.illustrative.json"), "utf8"),
) as unknown;

describe("transaction routes", () => {
  it("sends the built search request and returns the Cybersource body unchanged", async () => {
    let received: unknown;
    const app = createApp({
      environment: "apitest",
      client: {
        async search(body) {
          received = body;
          return { status: 201, data: searchFixture };
        },
        async getTransaction() {
          throw new Error("not used");
        },
      },
    });
    const response = await send(app, "POST", "/api/transactions/search", {
      dateRange: "custom",
      customStartDate: "2024-06-01",
      customEndDate: "2024-06-07",
      searchedAt: "2024-07-15T18:30:00.000Z",
      merchantReferenceNumber: "ORDER-1001",
      offset: 0,
      limit: 20,
      sort: "submitTimeUtc:desc",
    });
    expect(response.status).toBe(200);
    const payload = response.body as {
      cybersource: unknown;
      summaries: unknown[];
      request: { body: { query: string; timezone: string } };
    };
    expect(payload.cybersource).toEqual(searchFixture);
    expect(payload.summaries).toHaveLength(2);
    expect(payload.request.body.timezone).toBe("America/New_York");
    expect(payload.request.body.query).toContain("clientReferenceInformation.code:ORDER-1001");
    expect(payload.request.body.query).toContain("orderInformation.amountDetails.currency:USD");
    expect(payload.request.body.query).not.toContain("applicationInformation");
    expect(received).toMatchObject({ save: false, timezone: "America/New_York" });
  });

  it("keeps the same Eastern window when offset changes", async () => {
    const bodies: { query?: string; offset?: number }[] = [];
    const app = createApp({
      environment: "apitest",
      client: {
        async search(body) {
          bodies.push(body as { query?: string; offset?: number });
          return { status: 201, data: searchFixture };
        },
        async getTransaction() {
          throw new Error("not used");
        },
      },
    });
    const criteria = {
      dateRange: "yesterday",
      searchedAt: "2024-11-04T17:00:00.000Z",
      limit: 10,
    };
    await send(app, "POST", "/api/transactions/search", { ...criteria, offset: 0 });
    await send(app, "POST", "/api/transactions/search", { ...criteria, offset: 10 });
    expect(bodies[0]?.query).toBe(bodies[1]?.query);
    expect(bodies[0]?.query).toContain(
      `submitTimeUtc:[${Date.parse("2024-11-03T04:00:00Z")} TO ${Date.parse("2024-11-04T05:00:00Z")}}`,
    );
    expect(bodies[1]?.offset).toBe(10);
  });

  it("returns an empty summary list for an empty search", async () => {
    const response = await send(
      createApp({
        environment: "apitest",
        client: gateway({ status: 201, data: emptyFixture }),
      }),
      "POST",
      "/api/transactions/search",
      {},
    );
    expect(response.status).toBe(200);
    expect((response.body as { summaries: unknown[] }).summaries).toEqual([]);
  });

  it("retrieves a transaction by the request ID in the path", async () => {
    let requested = "";
    const response = await send(
      createApp({
        environment: "apitest",
        client: {
          async search() {
            throw new Error("not used");
          },
          async getTransaction(id) {
            requested = id;
            return { status: 200, data: detailsFixture };
          },
        },
      }),
      "GET",
      "/api/transactions/6012345678901234567890",
    );
    expect(requested).toBe("6012345678901234567890");
    const payload = response.body as {
      cybersource: { undocumentedDetailField: unknown };
      lineItems: { state: string };
      applications: { name: string; label: string }[];
    };
    expect(payload.cybersource.undocumentedDetailField).toEqual({ kept: true });
    expect(payload.lineItems.state).toBe("present");
    expect(payload.applications[0]).toMatchObject({
      name: "ics_auth",
      label: "Card Authorization",
    });
  });

  it("accepts a minimal transaction that omits optional sections", async () => {
    const response = await send(
      createApp({
        environment: "apitest",
        client: {
          async search() {
            throw new Error("not used");
          },
          async getTransaction() {
            return { status: 200, data: minimalFixture };
          },
        },
      }),
      "GET",
      "/api/transactions/6012345678901234567892",
    );
    const payload = response.body as {
      lineItems: { state: string };
      merchantDefinedInformation: { state: string };
      applications: unknown[];
    };
    expect(response.status).toBe(200);
    expect(payload.lineItems.state).toBe("missing");
    expect(payload.merchantDefinedInformation.state).toBe("missing");
    expect(payload.applications).toEqual([]);
  });

  it("does not expose credentials on the health route", async () => {
    const response = await send(
      createApp({ environment: "apitest", client: gateway({ status: 200, data: {} }) }),
      "GET",
      "/api/health",
    );
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain("CYBERSOURCE_SHARED_SECRET");
    expect(serialized).not.toContain("merchant");
    expect(serialized).not.toContain("secret");
    expect(response.body).toEqual({
      ok: true,
      service: "cybersource-transaction-inspector",
      environment: "apitest",
    });
  });
});

describe("Cybersource client errors", () => {
  const config: AppConfig = {
    environment: "apitest",
    baseUrl: "https://apitest.cybersource.com",
    host: "apitest.cybersource.com",
    merchantId: "merchant_test",
    keyId: "key-id",
    sharedSecret: "dGVzdC1zZWNyZXQ=",
    port: 3000,
    timeoutMs: 1000,
  };

  it.each([
    [400, "invalid"],
    [401, "signature"],
    [403, "refused"],
    [404, "did not find"],
    [429, "rate limited"],
    [500, "server error"],
    [502, "server error"],
    [503, "server error"],
  ])("maps HTTP %s", async (status, fragment) => {
    const client = new CybersourceClient(
      config,
      async () => new Response(JSON.stringify({}), { status }),
    );
    await expect(client.getTransaction("6012345678901234567890")).rejects.toMatchObject({
      status,
      upstreamStatus: status,
    });
    try {
      await client.getTransaction("6012345678901234567890");
    } catch (error) {
      expect(error).toBeInstanceOf(UpstreamError);
      expect(String(error).toLowerCase()).toContain(fragment);
      expect(String(error)).not.toContain(config.sharedSecret);
    }
  });

  it("maps timeouts and malformed responses", async () => {
    const timeoutClient = new CybersourceClient(config, async () => {
      throw Object.assign(new Error("timed out"), { name: "TimeoutError" });
    });
    await expect(timeoutClient.search({ save: false })).rejects.toMatchObject({
      status: 504,
      code: "TIMEOUT",
    });

    const malformed = new CybersourceClient(
      config,
      async () => new Response("not-json", { status: 200 }),
    );
    await expect(malformed.getTransaction("abc")).rejects.toMatchObject({
      code: "MALFORMED_RESPONSE",
      status: 502,
    });

    const network = new CybersourceClient(config, async () => {
      throw new Error("socket hang up");
    });
    await expect(network.getTransaction("abc")).rejects.toMatchObject({
      code: "NETWORK",
      status: 502,
    });
  });
});

describe("client bundle", () => {
  it("does not reference server credential variables", () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web");
    const files = walk(path.join(root, "src")).concat([
      path.join(root, "index.html"),
      path.join(root, "vite.config.ts"),
    ]);
    const forbidden = [
      "CYBERSOURCE_SHARED_SECRET",
      "CYBERSOURCE_KEY_ID",
      "CYBERSOURCE_MERCHANT_ID",
      "v-c-merchant-id",
    ];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const token of forbidden) {
        expect(source, file).not.toContain(token);
      }
    }
  });
});

function gateway(result: CybersourceResult): CybersourceGateway {
  return {
    async search() {
      return result;
    },
    async getTransaction() {
      return result;
    },
  };
}

async function send(
  app: Express,
  method: string,
  url: string,
  body?: unknown,
): Promise<{ status: number; body: unknown }> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once("listening", () => resolve());
  });
  const address = server.address() as AddressInfo;
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${url}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? (JSON.parse(text) as unknown) : null };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function walk(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}
