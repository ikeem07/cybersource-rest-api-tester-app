import { isRecord } from "./objects.js";

const REDACTED = "[redacted]";

const SENSITIVE_KEY = /^(securitycode|cvv|cvnumber|cvn|pin|trackdata|cardnumber)$/i;

export function sanitize(value: unknown): unknown {
  return walk(value, []);
}

function walk(value: unknown, path: string[]): unknown {
  if (Array.isArray(value)) {
    return value.map((item, index) => walk(item, path.concat(String(index))));
  }
  if (!isRecord(value)) {
    return value;
  }
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (shouldRedact(path, key)) {
      next[key] = REDACTED;
      continue;
    }
    next[key] = walk(child, path.concat(key));
  }
  return next;
}

function shouldRedact(path: string[], key: string): boolean {
  if (SENSITIVE_KEY.test(key)) {
    return true;
  }
  const joined = path.concat(key).join(".").toLowerCase();
  return joined.endsWith("card.number") || joined.endsWith("bank.account.number");
}
