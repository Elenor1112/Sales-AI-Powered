import { logger } from "@/lib/logger";

const GRAPH_BASE_URL = "https://graph.facebook.com";
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 15000;

function getApiVersion(): string {
  return process.env.META_API_VERSION || "v20.0";
}

export class MetaApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: number,
    public readonly type?: string,
    public readonly isRateLimited: boolean = false
  ) {
    super(message);
    this.name = "MetaApiError";
  }
}

interface GraphErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches a Meta Graph API endpoint with bounded retries and exponential
 * backoff on 429/5xx, plus a hard timeout via AbortController. Never logs
 * access tokens (see src/lib/logger.ts redaction config) — only the path is
 * logged, tokens are passed as query params but stripped before logging.
 */
export async function graphFetch<T>(
  path: string,
  params: Record<string, string | undefined> = {},
  options: { method?: "GET" | "POST" | "DELETE" } = {}
): Promise<T> {
  const url = new URL(`${GRAPH_BASE_URL}/${getApiVersion()}/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        method: options.method ?? "GET",
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        return (await response.json()) as T;
      }

      const body = (await response.json().catch(() => ({}))) as GraphErrorBody;
      const isRateLimited = response.status === 429 || body.error?.code === 4 || body.error?.code === 17;

      logger.warn(
        { path, status: response.status, graphErrorType: body.error?.type, graphErrorCode: body.error?.code },
        "Meta Graph API request failed"
      );

      if (isRetryableStatus(response.status) && attempt < MAX_RETRIES) {
        const backoffMs = 2 ** attempt * 500 + Math.random() * 250;
        await sleep(backoffMs);
        continue;
      }

      throw new MetaApiError(
        body.error?.message ?? `Meta API request failed with status ${response.status}`,
        response.status,
        body.error?.code,
        body.error?.type,
        isRateLimited
      );
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (error instanceof MetaApiError) throw error;
      if (attempt < MAX_RETRIES) {
        const backoffMs = 2 ** attempt * 500 + Math.random() * 250;
        logger.warn({ path, attempt, err: (error as Error)?.message }, "Meta API network error, retrying");
        await sleep(backoffMs);
        continue;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new MetaApiError("Meta API request failed after retries", 0);
}
