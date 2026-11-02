import { ValidationError, resolveSearchDateRange } from "@cybersource-tester/domain";
import { describe, expect, it } from "vitest";

const SUMMER = "2024-07-15T18:30:00.000Z";

function range(
  preset: Parameters<typeof resolveSearchDateRange>[0]["preset"],
  now: string,
  custom?: { customStartDate?: string; customEndDate?: string },
) {
  return resolveSearchDateRange({
    preset,
    now: new Date(now),
    customStartDate: custom?.customStartDate,
    customEndDate: custom?.customEndDate,
  });
}

describe("Eastern date ranges", () => {
  it("covers last 1 hour as 60 real minutes through the search instant", () => {
    const resolved = range("last_1_hour", SUMMER);
    expect(resolved.submittedFrom).toBe("2024-07-15T17:30:00Z");
    expect(resolved.submittedTo).toBe("2024-07-15T18:30:00Z");
  });

  it("covers today from Eastern midnight through the search instant", () => {
    const resolved = range("today", SUMMER);
    expect(resolved.submittedFrom).toBe("2024-07-15T04:00:00Z");
    expect(resolved.submittedTo).toBe("2024-07-15T18:30:00Z");
  });

  it("covers yesterday from Eastern midnight through the next Eastern midnight", () => {
    const resolved = range("yesterday", SUMMER);
    expect(resolved.submittedFrom).toBe("2024-07-14T04:00:00Z");
    expect(resolved.submittedTo).toBe("2024-07-15T04:00:00Z");
  });

  it("covers the previous 7 Eastern calendar days through the search instant", () => {
    const resolved = range("last_7_days", SUMMER);
    expect(resolved.submittedFrom).toBe("2024-07-08T18:30:00Z");
    expect(resolved.submittedTo).toBe("2024-07-15T18:30:00Z");
  });

  it("covers this month from Eastern midnight on the first through the search instant", () => {
    const resolved = range("this_month", SUMMER);
    expect(resolved.submittedFrom).toBe("2024-07-01T04:00:00Z");
    expect(resolved.submittedTo).toBe("2024-07-15T18:30:00Z");
  });

  it("covers the previous 30 Eastern calendar days through the search instant", () => {
    const resolved = range("last_30_days", SUMMER);
    expect(resolved.submittedFrom).toBe("2024-06-15T18:30:00Z");
    expect(resolved.submittedTo).toBe("2024-07-15T18:30:00Z");
  });

  it("uses an exclusive Eastern midnight after a custom end date", () => {
    const resolved = range("custom", SUMMER, {
      customStartDate: "2024-01-15",
      customEndDate: "2024-03-02",
    });
    expect(resolved.submittedFrom).toBe("2024-01-15T05:00:00Z");
    expect(resolved.submittedTo).toBe("2024-03-03T05:00:00Z");
  });

  it("accepts a custom range that crosses a year boundary", () => {
    const resolved = range("custom", SUMMER, {
      customStartDate: "2023-12-31",
      customEndDate: "2024-01-02",
    });
    expect(resolved.submittedFrom).toBe("2023-12-31T05:00:00Z");
    expect(resolved.submittedTo).toBe("2024-01-03T05:00:00Z");
  });

  it("includes February 29 on a leap year", () => {
    const resolved = range("custom", "2024-03-01T15:00:00.000Z", {
      customStartDate: "2024-02-28",
      customEndDate: "2024-02-29",
    });
    expect(resolved.submittedFrom).toBe("2024-02-28T05:00:00Z");
    expect(resolved.submittedTo).toBe("2024-03-01T05:00:00Z");
  });

  it("keeps last 7 days on the Eastern clock across the spring-forward transition", () => {
    const resolved = range("last_7_days", "2024-03-11T15:00:00.000Z");
    expect(resolved.submittedFrom).toBe("2024-03-04T16:00:00Z");
    expect(resolved.submittedTo).toBe("2024-03-11T15:00:00Z");
  });

  it("keeps last 7 days on the Eastern clock across the fall-back transition", () => {
    const resolved = range("last_7_days", "2024-11-04T16:00:00.000Z");
    expect(resolved.submittedFrom).toBe("2024-10-28T15:00:00Z");
    expect(resolved.submittedTo).toBe("2024-11-04T16:00:00Z");
  });

  it("starts today at Eastern midnight when the search falls after the spring-forward hour", () => {
    const resolved = range("today", "2024-03-10T16:00:00.000Z");
    expect(resolved.submittedFrom).toBe("2024-03-10T05:00:00Z");
    expect(resolved.submittedTo).toBe("2024-03-10T16:00:00Z");
  });

  it("measures yesterday across the fall-back day as an exclusive Eastern midnight", () => {
    const resolved = range("yesterday", "2024-11-04T17:00:00.000Z");
    expect(resolved.submittedFrom).toBe("2024-11-03T04:00:00Z");
    expect(resolved.submittedTo).toBe("2024-11-04T05:00:00Z");
  });

  it("measures last 1 hour as 60 minutes across the spring-forward jump", () => {
    const resolved = range("last_1_hour", "2024-03-10T07:30:00.000Z");
    expect(resolved.submittedFrom).toBe("2024-03-10T06:30:00Z");
    expect(resolved.submittedTo).toBe("2024-03-10T07:30:00Z");
  });

  it("starts this month at Eastern midnight on the first, including a year boundary", () => {
    const resolved = range("this_month", "2024-01-01T05:30:00.000Z");
    expect(resolved.submittedFrom).toBe("2024-01-01T05:00:00Z");
    expect(resolved.submittedTo).toBe("2024-01-01T05:30:00Z");
  });

  it("starts this month at Eastern midnight on March 1", () => {
    const resolved = range("this_month", "2024-03-01T06:00:00.000Z");
    expect(resolved.submittedFrom).toBe("2024-03-01T05:00:00Z");
    expect(resolved.submittedTo).toBe("2024-03-01T06:00:00Z");
  });

  it("rejects custom ranges that are missing or reversed", () => {
    expect(() => range("custom", SUMMER)).toThrow(/Choose a start date and an end date/);
    expect(() => range("custom", SUMMER, { customStartDate: "2024-06-02" })).toThrow(
      /Choose an end date/,
    );
    expect(() => range("custom", SUMMER, { customEndDate: "2024-06-02" })).toThrow(
      /Choose a start date/,
    );
    expect(() =>
      range("custom", SUMMER, { customStartDate: "2024-06-03", customEndDate: "2024-06-02" }),
    ).toThrow(ValidationError);
    expect(() =>
      range("custom", SUMMER, { customStartDate: "2024-06-03", customEndDate: "2024-06-02" }),
    ).toThrow(/Start date must be on or before the end date/);
    expect(() =>
      range("custom", SUMMER, { customStartDate: "2024-02-31", customEndDate: "2024-03-01" }),
    ).toThrow(/not a valid calendar date/);
  });

  it("allows a custom range that is a single Eastern calendar day", () => {
    const resolved = range("custom", SUMMER, {
      customStartDate: "2024-06-02",
      customEndDate: "2024-06-02",
    });
    expect(resolved.submittedFrom).toBe("2024-06-02T04:00:00Z");
    expect(resolved.submittedTo).toBe("2024-06-03T04:00:00Z");
  });
});
