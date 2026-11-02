/**
 * AVS codes for processorInformation.avs.code.
 * Source: AVS Codes for Other Processors
 * https://developer.cybersource.com/docs/cybs/en-us/avs-codes/reference/all/na/avs-codes/avs-codes-intro/avs-codes-other-processors.html
 *
 * processorInformation.avs.codeRaw is the processor's own value. Cybersource says
 * not to evaluate the AVS result from codeRaw.
 */
export interface InterpretedAvsCode {
  readonly code: string;
  readonly description: string | null;
  readonly known: boolean;
}

const AVS_CODES: Readonly<Record<string, string>> = {
  A: "Partial match: street address matches, but five-digit and nine-digit postal codes do not match.",
  B: "Partial match: street address matches, but postal code is not verified. Returned only for Visa cards not issued in the US.",
  C: "No match: street address and postal code do not match. Returned only for Visa cards not issued in the US.",
  D: "Match: street address and postal code match. Returned only for Visa cards not issued in the US.",
  E: "Invalid: AVS data is invalid, or AVS is not allowed for this card type.",
  F: "Partial match: card member's name does not match, but billing postal code matches.",
  G: "Not supported: issuing bank outside the US does not support AVS.",
  H: "Partial match: card member's name does not match, but street address and postal code match. Returned only for the American Express card type.",
  I: "No match: address not verified. Returned only for Visa cards not issued in the US.",
  K: "Partial match: card member's name matches, but billing address and billing postal code do not match. Returned only for the American Express card type.",
  L: "Partial match: card member's name and billing postal code match, but billing address does not match. Returned only for the American Express card type.",
  M: "Match: street address and postal code match. Returned only for Visa cards not issued in the US.",
  N: "No match: street address and postal code do not match, or card member's name, street address, and postal code do not match for American Express.",
  O: "Partial match: card member's name and billing address match, but billing postal code does not match. Returned only for the American Express card type.",
  P: "Partial match: postal code matches, but street address not verified. Returned only for Visa cards not issued in the US.",
  R: "System unavailable.",
  S: "Not supported: issuing bank in the US does not support AVS.",
  T: "Partial match: card member's name does not match, but street address matches. Returned only for the American Express card type.",
  U: "System unavailable: address information is unavailable because the US bank does not support AVS outside the US, or AVS is not functioning properly.",
  V: "Match: card member's name, billing address, and billing postal code match. Returned only for the American Express card type.",
  W: "Partial match: street address does not match, but nine-digit postal code matches.",
  X: "Match: street address and nine-digit postal code match.",
  Y: "Match: street address and five-digit postal code match.",
  Z: "Partial match: street address does not match, but five-digit postal code matches.",
  "1": "Not supported: AVS is not supported for this processor or card type, or AVS is disabled for the account.",
  "2": "Unrecognized: the processor returned an unrecognized value for the AVS response.",
  "3": "Match: address is confirmed. Returned only for PayPal Express Checkout.",
  "4": "No match: address is not confirmed. Returned only for PayPal Express Checkout.",
  "5": "No match: no AVS code was returned by the processor.",
};

export function interpretAvsCode(code: unknown): InterpretedAvsCode {
  const normalized = normalize(code);
  const description = AVS_CODES[normalized] ?? null;
  return { code: normalized, description, known: description !== null };
}

function normalize(code: unknown): string {
  if (typeof code === "number" && Number.isFinite(code)) {
    return String(code);
  }
  if (typeof code === "string") {
    return code.trim();
  }
  return "";
}
