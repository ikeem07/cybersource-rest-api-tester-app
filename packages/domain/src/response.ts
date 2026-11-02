import { interpretApplicationName } from "./applications.js";
import { interpretAvsCode } from "./avs-codes.js";
import { interpretCvnCode } from "./cvn-codes.js";
import { getArray, getRecord, isRecord, readPath, readString } from "./objects.js";
import { interpretReasonCode } from "./reason-codes.js";

export interface CollectionView<T> {
  readonly state: "missing" | "empty" | "present" | "invalid";
  readonly items: T[];
}

export interface SummaryRow {
  readonly id?: string;
  readonly submitTimeUtc?: string;
  readonly merchantReferenceNumber?: string;
  readonly amount?: string;
  readonly currency?: string;
  readonly email?: string;
  readonly applications: readonly string[];
  readonly source: Record<string, unknown>;
}

export function readTransactionSummaries(response: unknown): SummaryRow[] {
  if (!isRecord(response)) {
    return [];
  }
  const embedded = getRecord(response, "_embedded") ?? getRecord(response, "embedded");
  const list = embedded ? getArray(embedded, "transactionSummaries") : undefined;
  if (!list) {
    return [];
  }
  const rows: SummaryRow[] = [];
  for (const item of list) {
    if (!isRecord(item)) {
      continue;
    }
    rows.push(readSummary(item));
  }
  return rows;
}

export function readSummary(summary: Record<string, unknown>): SummaryRow {
  const amountDetails = readPath(summary, ["orderInformation", "amountDetails"]);
  const amountRecord = isRecord(amountDetails) ? amountDetails : undefined;
  return {
    id: readString(summary.id),
    submitTimeUtc: readString(summary.submitTimeUtc),
    merchantReferenceNumber: readString(readPath(summary, ["clientReferenceInformation", "code"])),
    amount: amountRecord ? readString(amountRecord.totalAmount) : undefined,
    currency: amountRecord ? readString(amountRecord.currency) : undefined,
    email: readString(readPath(summary, ["orderInformation", "billTo", "email"])),
    applications: readApplications(summary).flatMap((application) => {
      const name = readString(application.name);
      return name ? [name] : [];
    }),
    source: summary,
  };
}

export function readApplications(root: unknown): Record<string, unknown>[] {
  const info = isRecord(root) ? getRecord(root, "applicationInformation") : undefined;
  const list = info ? getArray(info, "applications") : undefined;
  if (!list) {
    return [];
  }
  return list.filter(isRecord);
}

export function readTotalCount(response: unknown): number | undefined {
  if (!isRecord(response)) {
    return undefined;
  }
  const total = response.totalCount;
  return typeof total === "number" && Number.isFinite(total) ? total : undefined;
}

export interface InterpretedApplication {
  readonly name: string;
  readonly label: string;
  readonly official: string | null;
  readonly knownName: boolean;
  readonly reasonCode: ReturnType<typeof interpretReasonCode> | null;
  readonly rCode: string | undefined;
  readonly rFlag: string | undefined;
  readonly rMessage: string | undefined;
  readonly reconciliationId: string | undefined;
  readonly source: Record<string, unknown>;
}

export function interpretApplications(root: unknown): InterpretedApplication[] {
  return readApplications(root).map((application) => {
    const name = readString(application.name) ?? "";
    const interpretedName = interpretApplicationName(name);
    const reasonPresent = application.reasonCode !== undefined && application.reasonCode !== null;
    return {
      name,
      label: interpretedName.label,
      official: interpretedName.official,
      knownName: interpretedName.known,
      reasonCode: reasonPresent ? interpretReasonCode(application.reasonCode) : null,
      rCode: readString(application.rCode),
      rFlag: readString(application.rFlag),
      rMessage: readString(application.rMessage),
      reconciliationId: readString(application.reconciliationId),
      source: application,
    };
  });
}

export function describeSettlement(root: unknown): string {
  const bill = interpretApplications(root).find((application) => application.name === "ics_bill");
  if (!bill) {
    return "This response does not include ics_bill (card settlement). A successful authorization, reason code 100 on another application, or HTTP 200/201 from search or details is not settlement completion.";
  }
  if (bill.reasonCode?.code === "100") {
    return "ics_bill is present with reason code 100. That is the settlement application's success code in this payload. It does not prove funds have finished moving at the processor.";
  }
  const code = bill.reasonCode?.code || "not returned";
  return `ics_bill is present with reason code ${code}. Card settlement did not report reason code 100 in this response.`;
}

export function readLineItems(root: unknown): CollectionView<Record<string, unknown>> {
  return readCollection(root, ["orderInformation", "lineItems"]);
}

export function readMerchantDefinedData(root: unknown): CollectionView<Record<string, unknown>> {
  return readCollection(root, ["merchantDefinedInformation"]);
}

export function readProcessorChecks(root: unknown): {
  avsCode: ReturnType<typeof interpretAvsCode> | null;
  avsCodeRaw: string | undefined;
  cvnCode: ReturnType<typeof interpretCvnCode> | null;
  cvnCodeRaw: string | undefined;
} {
  const avs = readPath(root, ["processorInformation", "avs"]);
  const cvn = readPath(root, ["processorInformation", "cardVerification"]);
  const avsRecord = isRecord(avs) ? avs : undefined;
  const cvnRecord = isRecord(cvn) ? cvn : undefined;
  return {
    avsCode: avsRecord && avsRecord.code !== undefined ? interpretAvsCode(avsRecord.code) : null,
    avsCodeRaw: avsRecord ? readString(avsRecord.codeRaw) : undefined,
    cvnCode:
      cvnRecord && cvnRecord.resultCode !== undefined
        ? interpretCvnCode(cvnRecord.resultCode)
        : null,
    cvnCodeRaw: cvnRecord ? readString(cvnRecord.resultCodeRaw) : undefined,
  };
}

export function readDirectHistory(root: unknown): {
  id: string | undefined;
  rootId: string | undefined;
  reconciliationId: string | undefined;
  merchantId: string | undefined;
  links: Record<string, unknown> | undefined;
  related: unknown;
} {
  if (!isRecord(root)) {
    return {
      id: undefined,
      rootId: undefined,
      reconciliationId: undefined,
      merchantId: undefined,
      links: undefined,
      related: undefined,
    };
  }
  return {
    id: readString(root.id),
    rootId: readString(root.rootId),
    reconciliationId: readString(root.reconciliationId),
    merchantId: readString(root.merchantId),
    links: getRecord(root, "_links"),
    related: root.relatedTransactions,
  };
}

export const HISTORY_LIMITATION =
  "These identifiers and links were returned on this transaction details response. The API does not assemble the Business Center transaction history in one payload. Open each related request ID separately. Missing identifiers were not returned and have not been inferred.";

function readCollection(
  root: unknown,
  path: readonly string[],
): CollectionView<Record<string, unknown>> {
  if (!isRecord(root)) {
    return { state: "missing", items: [] };
  }
  let parent: Record<string, unknown> = root;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    if (key === undefined || !(key in parent)) {
      return { state: "missing", items: [] };
    }
    const next = parent[key];
    if (!isRecord(next)) {
      return { state: "invalid", items: [] };
    }
    parent = next;
  }
  const leaf = path[path.length - 1];
  if (leaf === undefined || !(leaf in parent)) {
    return { state: "missing", items: [] };
  }
  const value = parent[leaf];
  if (value == null) {
    return { state: "missing", items: [] };
  }
  if (!Array.isArray(value)) {
    return { state: "invalid", items: [] };
  }
  if (value.length === 0) {
    return { state: "empty", items: [] };
  }
  return { state: "present", items: value.filter(isRecord) };
}
