import { MERCHANT_REFERENCE_PREFIX_PATTERN } from "@cybersource-tester/domain";

export type CybersourceEnvironment = "apitest" | "production" | "production-india";

export interface AppConfig {
  readonly environment: CybersourceEnvironment;
  readonly baseUrl: string;
  readonly host: string;
  readonly merchantId: string;
  readonly keyId: string;
  readonly sharedSecret: string;
  readonly port: number;
  readonly timeoutMs: number;
  readonly merchantReferencePrefix: string;
}

const CANONICAL_URLS: Record<CybersourceEnvironment, string> = {
  apitest: "https://apitest.cybersource.com",
  production: "https://api.cybersource.com",
  "production-india": "https://api.in.cybersource.com",
};

const REQUIRED = [
  "CYBERSOURCE_MERCHANT_ID",
  "CYBERSOURCE_KEY_ID",
  "CYBERSOURCE_SHARED_SECRET",
] as const;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const missing = REQUIRED.filter((name) => !readRequired(source[name]));
  if (missing.length > 0) {
    throw new ConfigError(
      `Missing Cybersource credentials: ${missing.join(", ")}. Set them in the server environment. Values are not logged.`,
    );
  }

  const environment = readRequired(source.CYBERSOURCE_ENVIRONMENT) || "apitest";
  if (!isEnvironment(environment)) {
    throw new ConfigError(
      "CYBERSOURCE_ENVIRONMENT must be apitest, production, or production-india.",
    );
  }

  const canonical = CANONICAL_URLS[environment];
  const baseUrl = (readRequired(source.CYBERSOURCE_BASE_URL) || canonical).replace(/\/$/, "");
  if (baseUrl !== canonical) {
    throw new ConfigError(
      `CYBERSOURCE_BASE_URL does not match CYBERSOURCE_ENVIRONMENT ${environment}. Expected ${canonical}.`,
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new ConfigError("CYBERSOURCE_BASE_URL is not a valid URL.");
  }

  const merchantId = readRequired(source.CYBERSOURCE_MERCHANT_ID);
  const keyId = readRequired(source.CYBERSOURCE_KEY_ID);
  const sharedSecret = readRequired(source.CYBERSOURCE_SHARED_SECRET);
  if (!merchantId || !keyId || !sharedSecret) {
    throw new ConfigError("Cybersource credentials are empty.");
  }

  return {
    environment,
    baseUrl,
    host: parsed.host,
    merchantId,
    keyId,
    sharedSecret,
    port: readPort(source.PORT),
    timeoutMs: readTimeout(source.CYBERSOURCE_TIMEOUT_MS),
    merchantReferencePrefix: readMerchantReferencePrefix(
      source.CYBERSOURCE_MERCHANT_REFERENCE_PREFIX,
    ),
  };
}

function readRequired(value: string | undefined): string {
  return value?.trim() ?? "";
}

function readMerchantReferencePrefix(value: string | undefined): string {
  const prefix = value?.trim() ?? "";
  if (!MERCHANT_REFERENCE_PREFIX_PATTERN.test(prefix)) {
    throw new ConfigError(
      "CYBERSOURCE_MERCHANT_REFERENCE_PREFIX must be 3 to 100 letters or digits. Transaction Search matches a prefix with a trailing wildcard, and that wildcard needs at least three characters before it.",
    );
  }
  return prefix;
}

function readPort(value: string | undefined): number {
  if (!value || !value.trim()) {
    return 3000;
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigError("PORT must be an integer from 1 to 65535.");
  }
  return port;
}

function readTimeout(value: string | undefined): number {
  if (!value || !value.trim()) {
    return 120_000;
  }
  const timeout = Number(value);
  if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 180_000) {
    throw new ConfigError("CYBERSOURCE_TIMEOUT_MS must be an integer from 1000 to 180000.");
  }
  return timeout;
}

function isEnvironment(value: string): value is CybersourceEnvironment {
  return value === "apitest" || value === "production" || value === "production-india";
}
