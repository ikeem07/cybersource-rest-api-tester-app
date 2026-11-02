/** Wall-clock arithmetic for America/New_York. Does not use the host timezone. */
export const EASTERN_TIME_ZONE = "America/New_York";

export interface EasternParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

const FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: EASTERN_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function easternParts(instant: Date): EasternParts {
  const bag: Record<string, string> = {};
  for (const part of FORMATTER.formatToParts(instant)) {
    if (part.type !== "literal") {
      bag[part.type] = part.value;
    }
  }
  let hour = numberPart(bag.hour);
  let day = numberPart(bag.day);
  let month = numberPart(bag.month);
  let year = numberPart(bag.year);
  if (hour === 24) {
    hour = 0;
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    year = next.getUTCFullYear();
    month = next.getUTCMonth() + 1;
    day = next.getUTCDate();
  }
  return {
    year,
    month,
    day,
    hour,
    minute: numberPart(bag.minute),
    second: numberPart(bag.second),
    millisecond: instant.getUTCMilliseconds(),
  };
}

/** Convert an Eastern wall-clock time to a UTC instant. */
export function easternWallTimeToUtc(parts: EasternParts): Date {
  const utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond,
  );
  const first = new Date(utcGuess - offsetMs(new Date(utcGuess)));
  if (sameWall(easternParts(first), parts)) {
    return first;
  }
  const second = new Date(utcGuess - offsetMs(first));
  if (sameWall(easternParts(second), parts)) {
    if (sameWall(easternParts(first), parts) && first.getTime() < second.getTime()) {
      return first;
    }
    return second;
  }
  return first.getTime() > second.getTime() ? first : second;
}

export function easternMidnight(year: number, month: number, day: number): Date {
  return easternWallTimeToUtc({
    year,
    month,
    day,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
}

/** Move by calendar days in Eastern Time, keeping the local time of day. */
export function addEasternCalendarDays(instant: Date, days: number): Date {
  const parts = easternParts(instant);
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return easternWallTimeToUtc({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
    millisecond: parts.millisecond,
  });
}

export function formatUtcInstant(instant: Date): string {
  return instant.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function offsetMs(instant: Date): number {
  const local = easternParts(instant);
  const asUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    local.second,
    local.millisecond,
  );
  return asUtc - instant.getTime();
}

function sameWall(actual: EasternParts, expected: EasternParts): boolean {
  return (
    actual.year === expected.year &&
    actual.month === expected.month &&
    actual.day === expected.day &&
    actual.hour === expected.hour &&
    actual.minute === expected.minute &&
    actual.second === expected.second &&
    actual.millisecond === expected.millisecond
  );
}

function numberPart(value: string | undefined): number {
  return Number(value ?? "0");
}
