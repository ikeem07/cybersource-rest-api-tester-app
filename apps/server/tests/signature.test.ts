import { describe, expect, it } from "vitest";
import { decodeSharedSecret, signCybersourceRequest } from "../src/signature.js";

const secret = "dGVzdC1zZWNyZXQ=";
const date = new Date("2019-07-18T00:18:03.000Z");
const body = '{"save":false,"query":"clientReferenceInformation.code:123456"}';

describe("HTTP signature", () => {
  it("matches a fixed POST vector, including Digest", () => {
    const signed = signCybersourceRequest({
      method: "POST",
      host: "apitest.cybersource.com",
      path: "/tss/v2/searches",
      merchantId: "testmerchant",
      keyId: "6d75ffad-ed36-4a6d-85af-5609185494f4",
      sharedSecret: secret,
      body,
      date,
    });
    expect(signed.digest).toBe("SHA-256=iuvi4hwh2xili3S+yH/GoWUBqEaj7IC2mv7bwnHwTDs=");
    expect(signed.headers.Digest).toBe(signed.digest);
    expect(signed.headers.Accept).toBe("application/json");
    expect(signed.headers.Date).toBe("Thu, 18 Jul 2019 00:18:03 GMT");
    expect(signed.headers.Signature).toBe(
      'keyid="6d75ffad-ed36-4a6d-85af-5609185494f4", algorithm="HmacSHA256", headers="host date (request-target) digest v-c-merchant-id", signature="E7rMhydcXRbvZ9cjQFIDcAGNAdDbLBfU0AFjUvjzNE0="',
    );
  });

  it("signs GET requests without a Digest header", () => {
    const signed = signCybersourceRequest({
      method: "GET",
      host: "apitest.cybersource.com",
      path: "/tss/v2/transactions/6012345678901234567890",
      merchantId: "testmerchant",
      keyId: "6d75ffad-ed36-4a6d-85af-5609185494f4",
      sharedSecret: secret,
      date,
    });
    expect(signed.headers.Accept).toBe("application/hal+json;charset=utf-8");
    expect(signed.digest).toBeUndefined();
    expect(signed.headers.Digest).toBeUndefined();
    expect(signed.headers.Signature).toContain(
      'headers="host date (request-target) v-c-merchant-id"',
    );
    expect(signed.headers.Signature).toContain(
      'signature="HBKlcnvbBgDETkm5LvzABFrNOp1jFHHYOLrHa3zckUk="',
    );
  });

  it("is deterministic for the same inputs", () => {
    const input = {
      method: "POST" as const,
      host: "apitest.cybersource.com",
      path: "/tss/v2/searches",
      merchantId: "testmerchant",
      keyId: "key",
      sharedSecret: secret,
      body,
      date,
    };
    expect(signCybersourceRequest(input).headers.Signature).toBe(
      signCybersourceRequest(input).headers.Signature,
    );
  });

  it("rejects a shared secret that is not Base64 and does not echo it", () => {
    const invalid = "not a secret!!!";
    expect(() => decodeSharedSecret(invalid)).toThrow(/was not logged/);
    try {
      decodeSharedSecret(invalid);
    } catch (error) {
      expect(String(error)).not.toContain(invalid);
    }
  });
});
