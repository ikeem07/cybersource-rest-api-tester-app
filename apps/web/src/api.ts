import type { SearchInput } from "@cybersource-tester/domain";

export interface ApiFailure {
  error: {
    code: string;
    message: string;
    status: number;
    cybersourceStatus?: number;
    details?: unknown;
  };
}

export function isApiFailure(value: unknown): value is ApiFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "object" &&
    value.error !== null &&
    "message" in value.error
  );
}

export async function searchTransactions(input: SearchInput): Promise<unknown> {
  return request("/api/transactions/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function getTransaction(id: string): Promise<unknown> {
  return request(`/api/transactions/${encodeURIComponent(id)}`);
}

export async function getHealth(): Promise<{ environment?: string }> {
  const response = await fetch("/api/health");
  if (!response.ok) {
    return {};
  }
  return (await response.json()) as { environment?: string };
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new Error("The local API could not be reached.");
  }
  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      throw new Error("The local API returned invalid JSON.");
    }
  }
  if (!response.ok) {
    if (isApiFailure(payload)) {
      throw new Error(payload.error.message);
    }
    throw new Error(`Request failed with HTTP ${response.status}.`);
  }
  return payload;
}
