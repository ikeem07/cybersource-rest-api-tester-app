import { formatEasternDateTime } from "@cybersource-tester/domain";
import { describe, expect, it } from "vitest";

describe("formatEasternDateTime", () => {
  it("converts UTC timestamps to America/New_York", () => {
    expect(formatEasternDateTime("2026-01-15T18:30:00Z")).toBe("01/15/2026 01:30:00 PM EST");
    expect(formatEasternDateTime("2026-07-15T18:30:00Z")).toBe("07/15/2026 02:30:00 PM EDT");
    expect(formatEasternDateTime("2026-11-03T18:44:40Z")).toBe("11/03/2026 01:44:40 PM EST");
    expect(formatEasternDateTime(new Date("2026-01-15T18:30:00Z"))).toBe(
      "01/15/2026 01:30:00 PM EST",
    );
  });

  it("uses EST for winter dates and EDT for summer dates", () => {
    expect(formatEasternDateTime("2026-01-15T05:00:00Z")).toBe("01/15/2026 12:00:00 AM EST");
    expect(formatEasternDateTime("2026-01-15T17:00:00Z")).toBe("01/15/2026 12:00:00 PM EST");
    expect(formatEasternDateTime("2026-07-15T16:00:00Z")).toBe("07/15/2026 12:00:00 PM EDT");
  });

  it("follows Eastern daylight-saving transitions", () => {
    expect(formatEasternDateTime("2026-03-08T06:59:59Z")).toBe("03/08/2026 01:59:59 AM EST");
    expect(formatEasternDateTime("2026-03-08T07:00:00Z")).toBe("03/08/2026 03:00:00 AM EDT");
    expect(formatEasternDateTime("2026-11-01T05:30:00Z")).toBe("11/01/2026 01:30:00 AM EDT");
    expect(formatEasternDateTime("2026-11-01T06:30:00Z")).toBe("11/01/2026 01:30:00 AM EST");
  });

  it("formats the same instant in Eastern Time regardless of the host timezone", () => {
    const formatted = formatEasternDateTime("2026-01-15T18:30:00Z");
    expect(formatted).toBe("01/15/2026 01:30:00 PM EST");
    const hostZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (hostZone !== "America/New_York") {
      const local = new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZoneName: "short",
      }).format(new Date("2026-01-15T18:30:00Z"));
      expect(local).not.toBe(formatted);
    }
  });

  it("treats a zone-less ISO timestamp as UTC", () => {
    expect(formatEasternDateTime("2026-01-15T18:30:00")).toBe("01/15/2026 01:30:00 PM EST");
  });

  it("sorts by the original timestamp when the Eastern display string would order differently", () => {
    const earlier = "2026-01-15T16:00:00Z";
    const later = "2026-01-15T18:00:00Z";
    expect(formatEasternDateTime(earlier)).toBe("01/15/2026 11:00:00 AM EST");
    expect(formatEasternDateTime(later)).toBe("01/15/2026 01:00:00 PM EST");
    const byTimestamp = [later, earlier].sort((left, right) => left.localeCompare(right));
    const byDisplay = [later, earlier].sort((left, right) =>
      (formatEasternDateTime(left) ?? "").localeCompare(formatEasternDateTime(right) ?? ""),
    );
    expect(byTimestamp).toEqual([earlier, later]);
    expect(byDisplay).toEqual([later, earlier]);
  });

  it("returns undefined for missing or invalid timestamps and leaves the input unchanged", () => {
    const original = "2026-01-15T18:30:00Z";
    expect(formatEasternDateTime(original)).toBe("01/15/2026 01:30:00 PM EST");
    expect(original).toBe("2026-01-15T18:30:00Z");
    expect(formatEasternDateTime(undefined)).toBeUndefined();
    expect(formatEasternDateTime(null)).toBeUndefined();
    expect(formatEasternDateTime("")).toBeUndefined();
    expect(formatEasternDateTime("   ")).toBeUndefined();
    expect(formatEasternDateTime("not-a-date")).toBeUndefined();
    expect(formatEasternDateTime("2026-13-01T00:00:00Z")).toBeUndefined();
    expect(formatEasternDateTime(new Date(Number.NaN))).toBeUndefined();
  });
});
