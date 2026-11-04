import { ValidationError } from "./errors.js";

/**
 * Transaction Search accepts a prefix match only as a trailing wildcard with
 * at least three characters before `*`. Leading wildcards and one- or
 * two-character prefixes are rejected by the API.
 */
export const MERCHANT_REFERENCE_PREFIX_PATTERN = /^[A-Za-z0-9]{3,100}$/;

export function assertMerchantReferencePrefix(prefix: string): string {
  const trimmed = prefix.trim();
  if (!MERCHANT_REFERENCE_PREFIX_PATTERN.test(trimmed)) {
    throw new ValidationError(
      "Merchant reference prefix must be 3 to 100 letters or digits. Transaction Search matches a prefix with a trailing wildcard, and that wildcard needs at least three characters before it.",
    );
  }
  return trimmed;
}

/**
 * Trim a merchant reference and prepend the configured prefix when the value
 * does not already start with it. Matching is case-sensitive. Empty input
 * stays empty; the global prefix clause still applies to the search.
 */
export function resolveMerchantReferenceNumber(
  input: string | null | undefined,
  prefix: string,
): string | undefined {
  const normalizedPrefix = assertMerchantReferencePrefix(prefix);
  const trimmed = input?.trim() ?? "";
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.startsWith(normalizedPrefix)) {
    return trimmed;
  }
  return `${normalizedPrefix}${trimmed}`;
}

/** Server-side prefix restriction for `POST /tss/v2/searches`. */
export function merchantReferencePrefixClause(prefix: string): string {
  const normalizedPrefix = assertMerchantReferencePrefix(prefix);
  return `clientReferenceInformation.code:${normalizedPrefix}*`;
}
