import {
  interpretApplicationName,
  interpretAvsCode,
  interpretCvnCode,
  interpretReasonCode,
  sanitize,
} from "@cybersource-tester/domain";
import { describe, expect, it } from "vitest";

describe("application names", () => {
  it("resolves documented names", () => {
    expect(interpretApplicationName("ics_auth").label).toBe("Card Authorization");
    expect(interpretApplicationName("ics_bill").label).toBe("Card Settlement");
    expect(interpretApplicationName("ics_credit").label).toBe("Card Credit");
    expect(interpretApplicationName("ics_auth_reversal").label).toBe("Authorization Reversal");
    expect(interpretApplicationName("ics_score").label).toBe("Fraud Screening");
    expect(interpretApplicationName("ics_decision").label).toBe("Decision Manager");
    expect(interpretApplicationName("ics_dcc").label).toBe("Dynamic Currency Conversion Lookup");
  });

  it("preserves unknown names", () => {
    const unknown = interpretApplicationName("ics_made_up");
    expect(unknown.known).toBe(false);
    expect(unknown.label).toBe("ics_made_up");
  });
});

describe("reason codes", () => {
  it("describes documented codes without treating every non-100 code as a failure", () => {
    expect(interpretReasonCode("100")).toMatchObject({
      description: "Transaction was successful.",
      outcome: "successful",
    });
    expect(interpretReasonCode(110).outcome).toBe("partial_approval");
    expect(interpretReasonCode("203").outcome).toBe("declined");
    expect(interpretReasonCode("480").outcome).toBe("review");
    expect(interpretReasonCode("151").outcome).toBe("processing_error");
    expect(interpretReasonCode("520").outcome).toBe("issuer_approved_merchant_declined");
    expect(interpretReasonCode("100").outcome).not.toBe("declined");
  });

  it("does not throw for an unknown code", () => {
    expect(interpretReasonCode("999")).toEqual({
      code: "999",
      description: null,
      outcome: "unknown",
      derived: true,
    });
    expect(interpretReasonCode(undefined).code).toBe("");
  });
});

describe("AVS and card verification codes", () => {
  it("resolves known AVS codes and keeps unknown codes", () => {
    expect(interpretAvsCode("Y").description).toMatch(/five-digit postal code match/);
    expect(interpretAvsCode("M").known).toBe(true);
    expect(interpretAvsCode("1").description).toMatch(/Not supported/);
    const unknown = interpretAvsCode("9");
    expect(unknown.known).toBe(false);
    expect(unknown.code).toBe("9");
    expect(unknown.description).toBeNull();
  });

  it("resolves known card verification codes and keeps unknown codes", () => {
    expect(interpretCvnCode("M").description).toBe("The CVN matched.");
    expect(interpretCvnCode("N").description).toBe("The CVN did not match.");
    expect(interpretCvnCode("P").known).toBe(true);
    expect(interpretCvnCode("Z")).toMatchObject({ code: "Z", known: false, description: null });
  });
});

describe("sanitized export", () => {
  it("redacts card and account numbers without removing request ids", () => {
    const sanitized = sanitize({
      id: "6012345678901234567890",
      paymentInformation: {
        card: { number: "4111111111111111", suffix: "1111", securityCode: "999" },
        bank: { account: { number: "123456789" } },
      },
    });
    expect(sanitized).toEqual({
      id: "6012345678901234567890",
      paymentInformation: {
        card: { number: "[redacted]", suffix: "1111", securityCode: "[redacted]" },
        bank: { account: { number: "[redacted]" } },
      },
    });
  });
});
