import { sanitize } from "@cybersource-tester/domain";
import type { AppConfig } from "./config.js";
import { signCybersourceRequest } from "./signature.js";

export interface CybersourceResult {
  readonly status: number;
  readonly data: unknown;
}

export interface CybersourceGateway {
  search(body: unknown): Promise<CybersourceResult>;
  getTransaction(id: string): Promise<CybersourceResult>;
}

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly upstreamStatus?: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

export class CybersourceClient implements CybersourceGateway {
  constructor(
    private readonly config: AppConfig,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
  ) {}

  search(body: unknown): Promise<CybersourceResult> {
    return this.request("POST", "/tss/v2/searches", body);
  }

  getTransaction(id: string): Promise<CybersourceResult> {
    return this.request("GET", `/tss/v2/transactions/${encodeURIComponent(id)}`);
  }

  private async request(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ): Promise<CybersourceResult> {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    let signed: ReturnType<typeof signCybersourceRequest>;
    try {
      signed = signCybersourceRequest({
        method,
        host: this.config.host,
        path,
        merchantId: this.config.merchantId,
        keyId: this.config.keyId,
        sharedSecret: this.config.sharedSecret,
        body: payload,
      });
    } catch (error) {
      throw new UpstreamError(errorMessage(error), 500, "SIGNING_FAILED");
    }

    const timeoutSignal = AbortSignal.timeout(this.config.timeoutMs);
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.config.baseUrl}${path}`, {
        method,
        headers: signed.headers,
        body: payload,
        signal: timeoutSignal,
      });
    } catch (error) {
      if (isTimeout(error)) {
        throw new UpstreamError(
          "The Cybersource request timed out. Transaction details can take longer than a normal payment call during busy periods.",
          504,
          "TIMEOUT",
        );
      }
      throw new UpstreamError(
        "The Cybersource request failed before a response was received.",
        502,
        "NETWORK",
      );
    }

    const text = await response.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text) as unknown;
      } catch {
        throw new UpstreamError(
          response.ok
            ? "Cybersource returned a response that was not valid JSON."
            : `Cybersource returned HTTP ${response.status} with a non-JSON body.`,
          response.ok ? 502 : mapStatus(response.status),
          "MALFORMED_RESPONSE",
          response.status,
        );
      }
    }

    if (!response.ok) {
      throw httpError(response.status, data, response.headers.get("retry-after"));
    }
    return { status: response.status, data };
  }
}

function httpError(status: number, data: unknown, retryAfter: string | null): UpstreamError {
  const safe = sanitize(data);
  const message = readUpstreamMessage(safe) ?? defaultMessage(status);
  const details = isObject(safe)
    ? {
        reason: typeof safe.reason === "string" ? safe.reason : undefined,
        message: typeof safe.message === "string" ? safe.message : undefined,
        retryAfter: retryAfter ?? undefined,
      }
    : undefined;
  return new UpstreamError(message, mapStatus(status), "CYBERSOURCE_HTTP_ERROR", status, details);
}

function mapStatus(status: number): number {
  if (status === 400 || status === 401 || status === 403 || status === 404 || status === 429) {
    return status;
  }
  if (status === 500 || status === 502 || status === 503) {
    return status;
  }
  if (status >= 400 && status <= 599) {
    return status;
  }
  return 502;
}

function defaultMessage(status: number): string {
  switch (status) {
    case 400:
      return "Cybersource rejected the search or transaction request as invalid.";
    case 401:
      return "Cybersource rejected the HTTP signature. Check the merchant ID, key ID, Base64 shared secret, host, and environment.";
    case 403:
      return "Cybersource refused access for this merchant key.";
    case 404:
      return "Cybersource did not find that transaction. A new request ID can return 404 until search indexing finishes; the Transaction Details guide says to retry after about five minutes.";
    case 429:
      return "Cybersource rate limited the request. Slow down and honor Retry-After when it is present.";
    case 500:
    case 502:
    case 503:
      return "Cybersource returned a server error. This tester does not retry automatically.";
    default:
      return `Cybersource returned HTTP ${status}.`;
  }
}

function readUpstreamMessage(data: unknown): string | undefined {
  if (!isObject(data)) {
    return undefined;
  }
  if (typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }
  if (typeof data.reason === "string" && data.reason.trim()) {
    return data.reason;
  }
  return undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTimeout(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === "TimeoutError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Request signing failed.";
}
