import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "../src/config.js";

const secret = "dGVzdC1zZWNyZXQ=";

function baseEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    CYBERSOURCE_ENVIRONMENT: "apitest",
    CYBERSOURCE_MERCHANT_ID: "merchant_test",
    CYBERSOURCE_KEY_ID: "key-id",
    CYBERSOURCE_SHARED_SECRET: secret,
    CYBERSOURCE_BASE_URL: "https://apitest.cybersource.com",
    PORT: "3000",
    ...overrides,
  };
}

describe("configuration", () => {
  it("requires merchant credentials", () => {
    expect(() =>
      loadConfig(
        baseEnv({
          CYBERSOURCE_MERCHANT_ID: " ",
          CYBERSOURCE_KEY_ID: "",
          CYBERSOURCE_SHARED_SECRET: undefined,
        }),
      ),
    ).toThrow(/CYBERSOURCE_MERCHANT_ID, CYBERSOURCE_KEY_ID, CYBERSOURCE_SHARED_SECRET/);
  });

  it("does not include credential values in the error", () => {
    try {
      loadConfig(baseEnv({ CYBERSOURCE_MERCHANT_ID: "" }));
      throw new Error("expected configuration to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect(String(error)).not.toContain(secret);
      expect(String(error)).not.toContain("key-id");
    }
  });

  it("resolves sandbox and production hosts", () => {
    expect(loadConfig(baseEnv()).baseUrl).toBe("https://apitest.cybersource.com");
    expect(loadConfig(baseEnv()).host).toBe("apitest.cybersource.com");
    const production = loadConfig(
      baseEnv({
        CYBERSOURCE_ENVIRONMENT: "production",
        CYBERSOURCE_BASE_URL: "https://api.cybersource.com",
      }),
    );
    expect(production.environment).toBe("production");
    expect(production.host).toBe("api.cybersource.com");
    const india = loadConfig(
      baseEnv({
        CYBERSOURCE_ENVIRONMENT: "production-india",
        CYBERSOURCE_BASE_URL: "https://api.in.cybersource.com",
      }),
    );
    expect(india.host).toBe("api.in.cybersource.com");
  });

  it("rejects an environment that does not match the base URL", () => {
    expect(() =>
      loadConfig(
        baseEnv({
          CYBERSOURCE_ENVIRONMENT: "production",
          CYBERSOURCE_BASE_URL: "https://apitest.cybersource.com",
        }),
      ),
    ).toThrow(/does not match/);
  });
});
