import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ValidationError,
  buildSearchRequest,
  interpretApplications,
  parseSearchInput,
  readLineItems,
  readMerchantDefinedData,
  readTotalCount,
  readTransactionSummaries,
} from "@cybersource-tester/domain";
import { describe, expect, it } from "vitest";

const fixtures = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../fixtures");

function load(name: string): unknown {
  return JSON.parse(readFileSync(path.join(fixtures, name), "utf8")) as unknown;
}

const SEARCHED_AT = "2024-07-15T18:30:00.000Z";

describe("transaction search query", () => {
  it("builds a documented query in Eastern Time and restricts currency to USD", () => {
    const built = buildSearchRequest(
      parseSearchInput({
        dateRange: "custom",
        customStartDate: "2024-06-01",
        customEndDate: "2024-06-07",
        searchedAt: SEARCHED_AT,
        merchantReferenceNumber: "ORDER-1001",
        requestId: "6012345678901234567890",
        amount: "25.00",
        offset: 20,
        limit: 10,
        sort: "id:asc,submitTimeUtc:asc",
      }),
    );

    expect(built.body).toEqual({
      save: false,
      name: "Transaction search",
      timezone: "America/New_York",
      query: `submitTimeUtc:[${Date.parse("2024-06-01T04:00:00Z")} TO ${Date.parse("2024-06-08T04:00:00Z")}} AND clientReferenceInformation.code:ORDER-1001 AND id:6012345678901234567890 AND orderInformation.amountDetails.totalAmount:25.00 AND orderInformation.amountDetails.currency:USD`,
      offset: 20,
      limit: 10,
      sort: "id:asc,submitTimeUtc:asc",
    });
    expect(built.body.query).not.toContain("applicationInformation");
  });

  it("quotes unsafe reference values and still forces USD", () => {
    const built = buildSearchRequest(
      parseSearchInput({
        dateRange: "last_1_hour",
        searchedAt: SEARCHED_AT,
        merchantReferenceNumber: "order 100",
      }),
    );
    expect(built.body.query).toBe(
      `submitTimeUtc:[${Date.parse("2024-07-15T17:30:00Z")} TO ${Date.parse("2024-07-15T18:30:00Z")}} AND clientReferenceInformation.code:"order 100" AND orderInformation.amountDetails.currency:USD`,
    );
    expect(built.body.timezone).toBe("America/New_York");
  });

  it("preserves the original Eastern date boundaries when the page changes", () => {
    const first = buildSearchRequest(
      parseSearchInput({
        dateRange: "last_7_days",
        searchedAt: SEARCHED_AT,
        offset: 0,
        limit: 20,
        sort: "submitTimeUtc:asc",
      }),
    );
    const second = buildSearchRequest(
      parseSearchInput({
        dateRange: "last_7_days",
        searchedAt: SEARCHED_AT,
        offset: 20,
        limit: 20,
        sort: "submitTimeUtc:asc",
      }),
    );
    expect(second.body.query).toBe(first.body.query);
    expect(second.body.query).toContain(
      `submitTimeUtc:[${Date.parse("2024-07-08T18:30:00Z")} TO ${Date.parse("2024-07-15T18:30:00Z")}}`,
    );
    expect(second.body.offset).toBe(20);
    expect(second.body.timezone).toBe("America/New_York");
    expect(second.body.query).toContain("orderInformation.amountDetails.currency:USD");
    expect(second.body.query).not.toContain("applicationInformation");
  });

  it("defaults an empty request to the last 7 Eastern days and USD", () => {
    const built = buildSearchRequest(parseSearchInput({ searchedAt: SEARCHED_AT }));
    expect(built.body.save).toBe(false);
    expect(built.body.timezone).toBe("America/New_York");
    expect(built.body.query).toBe(
      `submitTimeUtc:[${Date.parse("2024-07-08T18:30:00Z")} TO ${Date.parse("2024-07-15T18:30:00Z")}} AND orderInformation.amountDetails.currency:USD`,
    );
  });

  it("rejects status, currency, application, and timezone as search fields", () => {
    expect(() => parseSearchInput({ status: "AUTHORIZED" })).toThrow(
      /not a documented searchable field/,
    );
    expect(() => parseSearchInput({ currency: "EUR" })).toThrow(ValidationError);
    expect(() => parseSearchInput({ currency: "EUR" })).toThrow(/fixed to USD/);
    expect(() => parseSearchInput({ applicationName: "ics_auth" })).toThrow(/not a search field/);
    expect(() => parseSearchInput({ timezone: "America/Chicago" })).toThrow(/America\/New_York/);
  });
});

describe("transaction search responses", () => {
  it("parses multiple summaries and keeps missing optional fields empty", () => {
    const rows = readTransactionSummaries(load("transaction-search.illustrative.json"));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: "6012345678901234567890",
      merchantReferenceNumber: "ORDER-1001",
      amount: "25.00",
      currency: "USD",
      email: "buyer@example.com",
      applications: ["ics_auth", "ics_bill"],
    });
    expect(rows[1]?.email).toBeUndefined();
    expect(rows[1]?.applications).toEqual(["ics_auth", "custom_processor_app"]);
    expect(rows[0]?.source.exampleOnlySummaryField).toBe("preserved");
    expect(readTotalCount(load("transaction-search.illustrative.json"))).toBe(42);
  });

  it("handles an empty result set", () => {
    const body = load("transaction-search-empty.illustrative.json");
    expect(readTransactionSummaries(body)).toEqual([]);
    expect(readTotalCount(body)).toBe(0);
  });

  it("does not throw when the embedded collection is absent", () => {
    expect(readTransactionSummaries({ count: 0 })).toEqual([]);
    expect(readTransactionSummaries(null)).toEqual([]);
  });
});

describe("transaction details responses", () => {
  const details = load("transaction-details.illustrative.json");
  const minimal = load("transaction-details-minimal.illustrative.json");

  it("interprets applications and preserves unknown names and codes", () => {
    const applications = interpretApplications(details);
    expect(applications.map((application) => [application.name, application.label])).toEqual([
      ["ics_auth", "Card Authorization"],
      ["ics_score", "Fraud Screening"],
      ["ics_decision", "Decision Manager"],
      ["not_a_documented_application", "not_a_documented_application"],
    ]);
    expect(applications[3]?.knownName).toBe(false);
    expect(applications[3]?.reasonCode?.outcome).toBe("unknown");
    expect(applications[3]?.reasonCode?.code).toBe("999");
  });

  it("treats line items and merchant-defined data as optional collections", () => {
    expect(readLineItems(details).state).toBe("present");
    expect(readLineItems(details).items).toHaveLength(1);
    expect(readLineItems(minimal).state).toBe("missing");
    expect(readMerchantDefinedData(details).items).toHaveLength(2);
    expect(readMerchantDefinedData(minimal).state).toBe("missing");
    expect(readLineItems({ orderInformation: { lineItems: [] } }).state).toBe("empty");
  });

  it("preserves unknown fields on the source object", () => {
    expect(details).toMatchObject({
      undocumentedDetailField: { kept: true },
    });
    expect(readLineItems(details).items[0]?.futureLineField).toBe("preserved");
  });
});
