import {
  ValidationError,
  merchantReferencePrefixClause,
  resolveMerchantReferenceNumber,
} from "@cybersource-tester/domain";
import { describe, expect, it } from "vitest";

const PREFIX = "ABC";

describe("resolveMerchantReferenceNumber", () => {
  it("adds the prefix when it is missing", () => {
    expect(resolveMerchantReferenceNumber("12345", PREFIX)).toBe("ABC12345");
  });

  it("does not duplicate a prefix that is already present", () => {
    expect(resolveMerchantReferenceNumber("ABC12345", PREFIX)).toBe("ABC12345");
    expect(resolveMerchantReferenceNumber("ABC", PREFIX)).toBe("ABC");
  });

  it("adds the prefix when the input begins with a different string", () => {
    expect(resolveMerchantReferenceNumber("XYZ12345", PREFIX)).toBe("ABCXYZ12345");
  });

  it("does not prefix empty input", () => {
    expect(resolveMerchantReferenceNumber(undefined, PREFIX)).toBeUndefined();
    expect(resolveMerchantReferenceNumber(null, PREFIX)).toBeUndefined();
    expect(resolveMerchantReferenceNumber("", PREFIX)).toBeUndefined();
    expect(resolveMerchantReferenceNumber("   ", PREFIX)).toBeUndefined();
  });

  it("removes surrounding whitespace before matching", () => {
    expect(resolveMerchantReferenceNumber(" ABC12345 ", PREFIX)).toBe("ABC12345");
    expect(resolveMerchantReferenceNumber(" 12345 ", PREFIX)).toBe("ABC12345");
  });

  it("matches the prefix with case-sensitive comparison", () => {
    expect(resolveMerchantReferenceNumber("abc12345", PREFIX)).toBe("ABCabc12345");
    expect(resolveMerchantReferenceNumber("Abc12345", PREFIX)).toBe("ABCAbc12345");
  });

  it("trims the configured prefix before matching", () => {
    expect(resolveMerchantReferenceNumber("12345", " ABC ")).toBe("ABC12345");
  });

  it("rejects a prefix that Transaction Search cannot match with a trailing wildcard", () => {
    expect(() => resolveMerchantReferenceNumber("12345", "AB")).toThrow(ValidationError);
    expect(() => resolveMerchantReferenceNumber("12345", "A*")).toThrow(ValidationError);
    expect(() => merchantReferencePrefixClause("*ABC")).toThrow(ValidationError);
    expect(merchantReferencePrefixClause(PREFIX)).toBe("clientReferenceInformation.code:ABC*");
  });
});
