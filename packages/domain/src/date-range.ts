import {
  addEasternCalendarDays,
  easternMidnight,
  easternParts,
  formatUtcInstant,
} from "./eastern-time.js";
import { ValidationError } from "./errors.js";

export const SEARCH_TIME_ZONE = "America/New_York" as const;

export const DATE_RANGE_PRESETS = [
  "last_1_hour",
  "today",
  "yesterday",
  "last_7_days",
  "this_month",
  "last_30_days",
  "custom",
] as const;

export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];

export const DATE_RANGE_OPTIONS: readonly { value: DateRangePreset; label: string }[] = [
  { value: "last_1_hour", label: "Last 1 Hour" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "this_month", label: "This Month" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "custom", label: "Custom" },
];

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

export interface ResolvedDateRange {
  preset: DateRangePreset;
  submittedFrom: string;
  submittedTo: string;
  start: Date;
  end: Date;
}

const PRESET_SET = new Set<string>(DATE_RANGE_PRESETS);

export function isDateRangePreset(value: string): value is DateRangePreset {
  return PRESET_SET.has(value);
}

/**
 * Inclusive start and exclusive end, both expressed as UTC instants.
 * Calendar boundaries use America/New_York, including EST/EDT.
 * `now` is the instant when the search is executed.
 */
export function resolveSearchDateRange(input: {
  preset: DateRangePreset;
  now: Date;
  customStartDate?: string;
  customEndDate?: string;
}): ResolvedDateRange {
  const now = input.now;
  if (Number.isNaN(now.getTime())) {
    throw new ValidationError("searchedAt must be an ISO-8601 timestamp.");
  }

  let start: Date;
  let end: Date;
  switch (input.preset) {
    case "last_1_hour":
      start = new Date(now.getTime() - 60 * 60 * 1000);
      end = now;
      break;
    case "today": {
      const today = easternParts(now);
      start = easternMidnight(today.year, today.month, today.day);
      end = now;
      break;
    }
    case "yesterday": {
      const today = easternParts(now);
      end = easternMidnight(today.year, today.month, today.day);
      start = addEasternCalendarDays(end, -1);
      break;
    }
    case "last_7_days":
      start = addEasternCalendarDays(now, -7);
      end = now;
      break;
    case "this_month": {
      const today = easternParts(now);
      start = easternMidnight(today.year, today.month, 1);
      end = now;
      break;
    }
    case "last_30_days":
      start = addEasternCalendarDays(now, -30);
      end = now;
      break;
    case "custom": {
      const startDate = requireCalendarDate(input.customStartDate, input.customEndDate);
      const endDate = parseCalendarDate(input.customEndDate ?? "", "End date");
      if (compareCalendarDates(startDate, endDate) > 0) {
        throw new ValidationError("Start date must be on or before the end date.");
      }
      start = easternMidnight(startDate.year, startDate.month, startDate.day);
      const next = nextCalendarDay(endDate);
      end = easternMidnight(next.year, next.month, next.day);
      break;
    }
  }

  if (start.getTime() >= end.getTime()) {
    throw new ValidationError("The date range is empty for the selected time.");
  }

  return {
    preset: input.preset,
    submittedFrom: formatUtcInstant(start),
    submittedTo: formatUtcInstant(end),
    start,
    end,
  };
}

function requireCalendarDate(start: string | undefined, end: string | undefined): CalendarDate {
  const startMissing = !start?.trim();
  const endMissing = !end?.trim();
  if (startMissing && endMissing) {
    throw new ValidationError("Choose a start date and an end date.");
  }
  if (startMissing) {
    throw new ValidationError("Choose a start date.");
  }
  if (endMissing) {
    throw new ValidationError("Choose an end date.");
  }
  return parseCalendarDate(start ?? "", "Start date");
}

export function parseCalendarDate(value: string, label: string): CalendarDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    throw new ValidationError(`${label} must be a calendar date in YYYY-MM-DD form.`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new ValidationError(`${label} is not a valid calendar date.`);
  }
  return { year, month, day };
}

function compareCalendarDates(left: CalendarDate, right: CalendarDate): number {
  return left.year - right.year || left.month - right.month || left.day - right.day;
}

function nextCalendarDay(date: CalendarDate): CalendarDate {
  const probe = new Date(Date.UTC(date.year, date.month - 1, date.day + 1));
  return {
    year: probe.getUTCFullYear(),
    month: probe.getUTCMonth() + 1,
    day: probe.getUTCDate(),
  };
}
