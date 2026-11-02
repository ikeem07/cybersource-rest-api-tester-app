/**
 * Card verification result codes for processorInformation.cardVerification.resultCode.
 * Source: Cybersource CVN code table
 * https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-cvn-codes.html
 *
 * resultCodeRaw is the processor value and is displayed separately from this normalized code.
 */
export interface InterpretedCvnCode {
  readonly code: string;
  readonly description: string | null;
  readonly known: boolean;
}

const CVN_CODES: Readonly<Record<string, string>> = {
  D: "The transaction was considered to be suspicious by the issuing bank.",
  I: "The CVN failed the processor's data validation.",
  M: "The CVN matched.",
  N: "The CVN did not match.",
  P: "The CVN was not processed by the processor for an unspecified reason.",
  S: "The CVN is on the card but was not included in the request.",
  U: "Card verification is not supported by the issuing bank.",
  X: "Card verification is not supported by the card association.",
  "1": "Card verification is not supported for this processor or card type.",
  "2": "An unrecognized result code was returned by the processor for the card verification response.",
  "3": "No result code was returned by the processor.",
};

export function interpretCvnCode(code: unknown): InterpretedCvnCode {
  const normalized = normalize(code);
  const description = CVN_CODES[normalized] ?? null;
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
