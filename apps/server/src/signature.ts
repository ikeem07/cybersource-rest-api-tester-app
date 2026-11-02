import { createHash, createHmac } from "node:crypto";

export interface SignatureInput {
  readonly method: "GET" | "POST";
  readonly host: string;
  readonly path: string;
  readonly merchantId: string;
  readonly keyId: string;
  readonly sharedSecret: string;
  readonly body?: string;
  readonly date?: Date;
}

export interface SignedRequest {
  readonly headers: Record<string, string>;
  readonly body?: string;
  readonly digest?: string;
}

/**
 * HTTP Signature scheme from Cybersource "HTTP Signature Authentication".
 * POST signs host, date, (request-target), digest, and v-c-merchant-id.
 * GET omits digest. The shared secret is the Base64 value from Business Center.
 * The signing string has a newline between lines and no trailing newline.
 */
export function signCybersourceRequest(input: SignatureInput): SignedRequest {
  const date = formatRfc1123(input.date ?? new Date());
  const target = `${input.method.toLowerCase()} ${input.path}`;
  const lines = [`host: ${input.host}`, `date: ${date}`, `(request-target): ${target}`];

  let digest: string | undefined;
  if (input.method !== "GET") {
    if (input.body === undefined) {
      throw new Error("POST requests require a body so the Digest header can be generated.");
    }
    digest = createDigest(input.body);
    lines.push(`digest: ${digest}`);
  }
  lines.push(`v-c-merchant-id: ${input.merchantId}`);

  const signature = createHmac("sha256", decodeSharedSecret(input.sharedSecret))
    .update(lines.join("\n"), "utf8")
    .digest("base64");
  const signedHeaders =
    input.method === "GET"
      ? "host date (request-target) v-c-merchant-id"
      : "host date (request-target) digest v-c-merchant-id";

  const headers: Record<string, string> = {
    Host: input.host,
    Date: date,
    "v-c-merchant-id": input.merchantId,
    // Search rejects application/hal+json with an HTML 406. Details rejects application/json.
    Accept: input.method === "POST" ? "application/json" : "application/hal+json;charset=utf-8",
    Signature: `keyid="${input.keyId}", algorithm="HmacSHA256", headers="${signedHeaders}", signature="${signature}"`,
  };
  if (digest) {
    headers.Digest = digest;
    headers["Content-Type"] = "application/json";
  }
  return { headers, body: input.body, digest };
}

export function createDigest(body: string): string {
  return `SHA-256=${createHash("sha256").update(body, "utf8").digest("base64")}`;
}

export function formatRfc1123(date: Date): string {
  return date.toUTCString();
}

export function decodeSharedSecret(secret: string): Buffer {
  const trimmed = secret.trim();
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(trimmed) || trimmed.length < 8) {
    throw new Error(
      "CYBERSOURCE_SHARED_SECRET must be the Base64-encoded shared secret from the Business Center. The value was rejected and was not logged.",
    );
  }
  const decoded = Buffer.from(trimmed, "base64");
  const canonical = decoded.toString("base64").replace(/=+$/, "");
  if (decoded.length === 0 || canonical !== trimmed.replace(/=+$/, "")) {
    throw new Error(
      "CYBERSOURCE_SHARED_SECRET is not valid Base64. The value was rejected and was not logged.",
    );
  }
  return decoded;
}
