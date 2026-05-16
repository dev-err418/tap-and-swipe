const PLUNK_TIMEOUT_MS = 10_000;

type PlunkRecipient = string | { email: string; name?: string };
type PlunkFrom = string | { email: string; name?: string };
type PlunkDataValue =
  | string
  | number
  | boolean
  | null
  | { value: string | number | boolean | null; persistent: false };

export type PlunkEmailPayload = {
  to: PlunkRecipient | PlunkRecipient[];
  subject?: string;
  body?: string;
  template?: string;
  from?: PlunkFrom;
  reply?: string;
  data?: Record<string, PlunkDataValue>;
  subscribed?: boolean;
};

export type PlunkEmailConfig = {
  apiUrl?: string;
  apiKey?: string;
};

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function getPlunkConfig(config: PlunkEmailConfig = {}) {
  const apiUrl = (config.apiUrl ?? process.env.PLUNK_API_URL)?.replace(/\/+$/, "");
  const apiKey = config.apiKey ?? process.env.PLUNK_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new Error("PLUNK_API_URL and PLUNK_API_KEY must be set");
  }

  return { apiUrl, apiKey };
}

export async function sendPlunkEmail(
  payload: PlunkEmailPayload,
  config?: PlunkEmailConfig,
) {
  const { apiUrl, apiKey } = getPlunkConfig(config);
  const res = await fetchWithTimeout(
    `${apiUrl}/v1/send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    },
    PLUNK_TIMEOUT_MS,
  );

  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: unknown;
    message?: string;
    error?: string;
  } | null;

  if (!res.ok || json?.success === false) {
    throw new Error(
      json?.message ??
        json?.error ??
        `Plunk email send failed with status ${res.status}`,
    );
  }

  return json?.data ?? json;
}
