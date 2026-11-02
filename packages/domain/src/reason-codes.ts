/**
 * Reason codes documented for the Simple Order API. Transaction Search returns
 * the same numeric codes on `applicationInformation` and each application.
 * Source: https://developer.cybersource.com/docs/cybs/en-us/reason-codes-so/reference/all/so/reason-codes-so/reason-codes-so.md
 *
 * Outcome is an interpretation. It is not a field Cybersource returns.
 * Reason code 100 means that application succeeded. It does not mean settlement
 * completed, and codes other than 100 are not all failures.
 */
export type ReasonOutcome =
  | "successful"
  | "partial_approval"
  | "declined"
  | "review"
  | "processing_error"
  | "authentication_required"
  | "configuration_error"
  | "issuer_approved_merchant_declined"
  | "needs_follow_up"
  | "unknown";

export interface InterpretedReasonCode {
  readonly code: string;
  readonly description: string | null;
  readonly outcome: ReasonOutcome;
  readonly derived: true;
}

const DESCRIPTIONS: Readonly<Record<string, string>> = {
  "100": "Transaction was successful.",
  "101": "Request is missing one or more required fields.",
  "102": "One or more fields in the request contain invalid data.",
  "104":
    "Merchant reference code matches another authorization request sent within the past 15 minutes.",
  "105": "Merchant transaction identifier has already been used in the past 60 days.",
  "110": "Only a partial amount was approved.",
  "150": "System error.",
  "151": "Request was received but a server timeout occurred.",
  "152": "Request was received, but a service did not finish running in time.",
  "153": "Account is not enabled for the OCT service.",
  "154": "Payout failed due to a MAC validation failure. The payout was not sent to the customer.",
  "200":
    "Authorization was approved by the issuing bank but declined because AVS could not verify it.",
  "201": "Issuing bank has questions about the request.",
  "202": "Card is expired, or the expiration date does not match the date on file.",
  "203": "Card was declined. No other information was provided by the issuing bank.",
  "204": "Account does not contain sufficient funds.",
  "205": "Card is lost or stolen.",
  "207": "Issuing bank is unavailable.",
  "208": "Card is inactive or not authorized for the transaction channel.",
  "209": "CVN did not match.",
  "210": "Account reached the credit limit, or the amount exceeds the approved limit.",
  "211": "CVN is invalid.",
  "212": "EMV transaction was rejected.",
  "213": "Account is in fraud watch status.",
  "216": "Some of the card data was invalid.",
  "220": "Generic decline.",
  "221": "Customer's account is frozen.",
  "222": "The customer matched an entry on the processor's negative file.",
  "230":
    "Authorization was approved by the issuing bank but declined because CVN could not be verified.",
  "231": "Account number is invalid.",
  "232": "Payment processor does not accept the card type.",
  "233": "Processor declined the card.",
  "234": "Information in the Cybersource account is incorrect.",
  "235": "Requested amount exceeds the authorized amount or approved limit.",
  "236": "Processor failed.",
  "237": "Transaction was already captured.",
  "238": "Transaction was already reversed.",
  "239": "Requested transaction amount does not match the previous transaction amount.",
  "240": "Card type is invalid or does not correlate with the payment card number.",
  "241": "Request ID is invalid, or the processor declined a PIN debit.",
  "242": "No corresponding unused authorization or reversal target was found.",
  "243": "Transaction is already settled or reversed.",
  "244": "Account number did not pass a verification check.",
  "246": "Capture or credit cannot be voided, or the transaction type cannot be voided.",
  "247": "Credit was requested for a capture that was previously voided.",
  "248": "The Boleto request was declined by the processor.",
  "250": "Request was received, but a timeout occurred at the payment processor.",
  "251": "Customer exceeded a debit-card use, PIN, or daily amount limit.",
  "254": "Stand-alone credits are not allowed.",
  "256": "Credit amount exceeds the maximum allowed for the account.",
  "257": "Gift card or prepaid card account is already active.",
  "259": "Reload limit for the gift card or prepaid card was exceeded.",
  "260": "Requested amount conflicts with the gift card or prepaid card minimum or maximum.",
  "261": "Merchant account setup is invalid or missing on the acquirer's gateway.",
  "262": "Request is still in progress.",
  "263": "Mass transit transaction was declined.",
  "264": "Processor missing field.",
  "268": "Transaction error: unable to confirm. Do not reprocess until the processor is contacted.",
  "400": "Fraud score exceeds threshold.",
  "403": "Communication error, including HTTP errors or incorrect API keys during validation.",
  "428": "Strong customer authentication exemption was declined. SCA is required.",
  "450": "Apartment number missing or not found.",
  "451": "Insufficient address information.",
  "452": "House/box number not found on street.",
  "453": "Multiple address matches were found.",
  "454": "P.O. Box identifier not found or out of range.",
  "455": "Route service identifier not found or out of range.",
  "456": "Street name not found in postal code.",
  "457": "Postal code not found in database.",
  "458": "Unable to verify or correct address.",
  "459": "Multiple international address matches were found.",
  "460": "Address match not found.",
  "461": "Unsupported character set.",
  "465": "Payer Authentication problem. The payer could not be authenticated.",
  "474": "PIN data required.",
  "475": "Cardholder is enrolled in Payer Authentication.",
  "476": "Payer Authentication problem. The payer could not be authenticated.",
  "478": "Strong customer authentication is required for this transaction.",
  "480": "The order is marked for review by Decision Manager.",
  "481": "The order has been rejected by Decision Manager.",
  "490": "Aggregator or acquirer is not accepting the requested service.",
  "491": "Aggregator or acquirer rejected the transaction because a limit or refusal rule matched.",
  "493": "Acquirer or aggregator is rejecting this transaction: SAFEGUARDS.",
  "494": "Internal safeguards are preventing this transaction from processing.",
  "520":
    "Authorization was approved by the issuing bank but declined based on Smart Authorization settings.",
  "700": "The customer matched the Denied Parties List.",
  "701": "Export bill-to or ship-to country match.",
  "702": "Export email country match.",
  "703": "Export hostname or IP country match.",
};

const OUTCOMES: Readonly<Record<string, ReasonOutcome>> = {
  "100": "successful",
  "110": "partial_approval",
  "150": "processing_error",
  "151": "processing_error",
  "152": "processing_error",
  "200": "issuer_approved_merchant_declined",
  "201": "needs_follow_up",
  "230": "issuer_approved_merchant_declined",
  "234": "configuration_error",
  "236": "processing_error",
  "250": "processing_error",
  "261": "configuration_error",
  "262": "needs_follow_up",
  "264": "processing_error",
  "268": "processing_error",
  "400": "review",
  "403": "processing_error",
  "428": "authentication_required",
  "465": "authentication_required",
  "475": "authentication_required",
  "476": "authentication_required",
  "478": "authentication_required",
  "480": "review",
  "481": "declined",
  "520": "issuer_approved_merchant_declined",
};

export const REASON_OUTCOME_LABELS: Readonly<Record<ReasonOutcome, string>> = {
  successful: "Successful",
  partial_approval: "Partial approval",
  declined: "Declined",
  review: "Review",
  processing_error: "Processing error",
  authentication_required: "Authentication required",
  configuration_error: "Configuration error",
  issuer_approved_merchant_declined: "Issuer approved, declined by merchant rules",
  needs_follow_up: "Needs follow-up",
  unknown: "Unknown code",
};

export function interpretReasonCode(code: unknown): InterpretedReasonCode {
  const normalized = normalizeCode(code);
  if (!normalized) {
    return { code: "", description: null, outcome: "unknown", derived: true };
  }
  const description = DESCRIPTIONS[normalized] ?? null;
  const outcome = OUTCOMES[normalized] ?? (description ? "declined" : "unknown");
  return { code: normalized, description, outcome, derived: true };
}

function normalizeCode(code: unknown): string {
  if (typeof code === "number" && Number.isFinite(code)) {
    return String(code);
  }
  if (typeof code === "string") {
    return code.trim();
  }
  return "";
}
