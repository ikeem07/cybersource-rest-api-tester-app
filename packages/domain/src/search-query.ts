import {
  DATE_RANGE_PRESETS,
  type DateRangePreset,
  SEARCH_TIME_ZONE,
  isDateRangePreset,
  resolveSearchDateRange,
} from "./date-range.js";
import { ValidationError } from "./errors.js";
import {
  merchantReferencePrefixClause,
  resolveMerchantReferenceNumber,
} from "./merchant-reference.js";

export interface SearchInput {
  dateRange: DateRangePreset;
  customStartDate?: string;
  customEndDate?: string;
  searchedAt: string;
  merchantReferenceNumber?: string;
  requestId?: string;
  amount?: string;
  offset?: number;
  limit?: number;
  sort?: string;
}

export interface CybersourceSearchBody {
  save: false;
  name: string;
  timezone: typeof SEARCH_TIME_ZONE;
  query: string;
  offset: number;
  limit: number;
  sort: string;
}

export interface BuiltSearch {
  body: CybersourceSearchBody;
  submittedFrom: string;
  submittedTo: string;
}

export interface SearchBuildOptions {
  merchantReferencePrefix: string;
}

const ALLOWED_KEYS = new Set([
  "dateRange",
  "customStartDate",
  "customEndDate",
  "searchedAt",
  "merchantReferenceNumber",
  "requestId",
  "amount",
  "offset",
  "limit",
  "sort",
]);

const SORTS = new Set([
  "submitTimeUtc:desc",
  "submitTimeUtc:asc",
  "id:desc",
  "id:asc",
  "submitTimeUtc:desc,id:desc",
  "submitTimeUtc:asc,id:asc",
  "id:asc,submitTimeUtc:asc",
  "id:desc,submitTimeUtc:desc",
]);

export function parseSearchInput(value: unknown): SearchInput {
  if (!isPlainObject(value)) {
    throw new ValidationError("Search body must be a JSON object.");
  }
  for (const key of Object.keys(value)) {
    if (key === "status") {
      throw new ValidationError(
        "Transaction status is not a documented searchable field for POST /tss/v2/searches.",
      );
    }
    if (key === "currency") {
      throw new ValidationError("Currency is fixed to USD and cannot be selected.");
    }
    if (key === "applicationName") {
      throw new ValidationError("Application is not a search field.");
    }
    if (key === "timezone") {
      throw new ValidationError("Timezone is fixed to America/New_York and cannot be selected.");
    }
    if (!ALLOWED_KEYS.has(key)) {
      throw new ValidationError(`Unsupported search field "${key}".`);
    }
  }

  const dateRange = value.dateRange === undefined ? "last_7_days" : value.dateRange;
  if (typeof dateRange !== "string" || !isDateRangePreset(dateRange)) {
    throw new ValidationError(`dateRange must be one of: ${DATE_RANGE_PRESETS.join(", ")}.`);
  }

  return {
    dateRange,
    customStartDate: optionalString(value.customStartDate, "customStartDate"),
    customEndDate: optionalString(value.customEndDate, "customEndDate"),
    searchedAt: optionalString(value.searchedAt, "searchedAt") ?? new Date().toISOString(),
    merchantReferenceNumber: optionalString(
      value.merchantReferenceNumber,
      "merchantReferenceNumber",
    ),
    requestId: optionalString(value.requestId, "requestId"),
    amount: optionalString(value.amount, "amount"),
    offset: optionalInteger(value.offset, "offset", 0, 100_000),
    limit: optionalInteger(value.limit, "limit", 1, 100),
    sort: optionalString(value.sort, "sort"),
  };
}

export function buildSearchRequest(input: SearchInput, options: SearchBuildOptions): BuiltSearch {
  const range = resolveSearchDateRange({
    preset: input.dateRange,
    now: new Date(input.searchedAt),
    customStartDate: input.customStartDate,
    customEndDate: input.customEndDate,
  });
  // Absolute ISO timestamps fail date parsing on this API. Epoch milliseconds are accepted.
  const clauses = [`submitTimeUtc:[${range.start.getTime()} TO ${range.end.getTime()}}`];
  const merchantReferenceNumber = resolveMerchantReferenceNumber(
    input.merchantReferenceNumber,
    options.merchantReferencePrefix,
  );
  clauses.push(merchantReferencePrefixClause(options.merchantReferencePrefix));
  if (merchantReferenceNumber) {
    clauses.push(`clientReferenceInformation.code:${quoteQueryValue(merchantReferenceNumber)}`);
  }
  if (input.requestId) {
    if (!/^[A-Za-z0-9]+$/.test(input.requestId)) {
      throw new ValidationError("Request ID may contain only letters and digits.");
    }
    clauses.push(`id:${input.requestId}`);
  }
  if (input.amount) {
    if (!/^\d+(\.\d{1,2})?$/.test(input.amount)) {
      throw new ValidationError(
        "Amount must be a positive decimal with at most two fractional digits.",
      );
    }
    clauses.push(`orderInformation.amountDetails.totalAmount:${input.amount}`);
  }
  // Bracket syntax is a range and is rejected for a currency code. field:value is accepted.
  clauses.push("orderInformation.amountDetails.currency:USD");

  const query = clauses.join(" AND ");
  if (query.length > 2000) {
    throw new ValidationError("The generated search query is too long.");
  }

  const sort = input.sort ?? "submitTimeUtc:desc";
  if (!SORTS.has(sort)) {
    throw new ValidationError(
      "Sort must use submitTimeUtc and/or id with asc or desc. Other sort fields are not confirmed as supported.",
    );
  }

  return {
    submittedFrom: range.submittedFrom,
    submittedTo: range.submittedTo,
    body: {
      save: false,
      name: "Transaction search",
      timezone: SEARCH_TIME_ZONE,
      query,
      offset: input.offset ?? 0,
      limit: input.limit ?? 20,
      sort,
    },
  };
}

export function parseTransactionId(id: string): string {
  const trimmed = id.trim();
  if (!/^[A-Za-z0-9-]{1,64}$/.test(trimmed)) {
    throw new ValidationError("Request ID must be 1-64 letters, digits, or hyphens.");
  }
  return trimmed;
}

function quoteQueryValue(value: string): string {
  if (/[\r\n]/.test(value)) {
    throw new ValidationError("Search values cannot contain line breaks.");
  }
  if (/^[A-Za-z0-9._@+-]+$/.test(value)) {
    return value;
  }
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a string.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.length > 200) {
    throw new ValidationError(`${field} is too long.`);
  }
  return trimmed;
}

function optionalInteger(
  value: unknown,
  field: string,
  min: number,
  max: number,
): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new ValidationError(`${field} must be an integer.`);
  }
  if (value < min || value > max) {
    throw new ValidationError(`${field} must be between ${min} and ${max}.`);
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
