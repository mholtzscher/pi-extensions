import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";

const PROVIDER = "openai-codex";
const STATUS_KEY = "codex-weekly-usage";
const USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";
const REQUEST_TIMEOUT_MS = 15 * 1000;
const WEEK_SECONDS = 7 * 24 * 60 * 60;
const JWT_CLAIM_PATH = "https://api.openai.com/auth";

/** The model type the registry accepts, derived so pi-ai stays a transitive dep. */
type RegistryModel = Parameters<
  ExtensionContext["modelRegistry"]["getApiKeyAndHeaders"]
>[0];

/** Every value the usage endpoint can return through a JSON round trip. */
type JsonValue = boolean | number | string | null | JsonValue[] | JsonObject;

/** Decoded JSON object; keys come from the endpoint, values stay within JsonValue. */
interface JsonObject {
  [key: string]: JsonValue | undefined;
}

interface UsageWindow {
  used_percent?: JsonValue;
  limit_window_seconds?: JsonValue;
  reset_at?: JsonValue;
}

interface UsageResponse {
  rate_limit?: {
    primary_window?: UsageWindow | null;
    secondary_window?: UsageWindow | null;
  };
}

// `value: unknown` is deliberate: the ruleset exempts type-predicate subjects, so
// every decoder that takes unparsed input is a predicate like this one.
const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null;

const isUsageWindow = (value: unknown): value is UsageWindow => isObject(value);

const isUsageResponse = (value: unknown): value is UsageResponse => {
  if (!isObject(value)) {
    return false;
  }

  const { rate_limit: rateLimit } = value;
  if (rateLimit === undefined) {
    return true;
  }
  if (!isObject(rateLimit)) {
    return false;
  }

  // Windows arrive as objects when active and null when the plan has no
  // such window (e.g. secondary_window is null on current plans).
  const { primary_window: primary, secondary_window: secondary } = rateLimit;
  return (
    (primary === undefined || primary === null || isUsageWindow(primary)) &&
    (secondary === undefined || secondary === null || isUsageWindow(secondary))
  );
};

const isFiniteNumber = (value: JsonValue | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isNumericString = (value: JsonValue | undefined): value is string =>
  typeof value === "string" &&
  value.trim() !== "" &&
  Number.isFinite(Number(value));

const isNonEmptyString = (value: JsonValue | undefined): value is string =>
  typeof value === "string" && value !== "";

/** Reads a usage field that arrives as either a number or a numeric string. */
const numberValue = (value: JsonValue | undefined): number | undefined => {
  if (isFiniteNumber(value)) {
    return value;
  }
  if (isNumericString(value)) {
    return Number(value);
  }
  return undefined;
};

const hasHeader = (headers: Record<string, string>, name: string): boolean =>
  Object.keys(headers).some(
    (header) => header.toLowerCase() === name.toLowerCase()
  );

/**
 * Derives the ChatGPT account id from the Codex OAuth access token, mirroring
 * pi's own Codex transport. The wham/usage backend requires it alongside the
 * bearer token; without it requests fail and the meter shows unavailable.
 */
const extractAccountId = (token: string): string | undefined => {
  try {
    const parts = token.split(".");
    const [, payload] = parts;
    if (parts.length !== 3 || payload === undefined) {
      return undefined;
    }
    const decoded: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf-8")
    );
    if (!isObject(decoded)) {
      return undefined;
    }
    const claim = decoded[JWT_CLAIM_PATH];
    if (!isObject(claim)) {
      return undefined;
    }
    const accountId = claim.chatgpt_account_id;
    return isNonEmptyString(accountId) ? accountId : undefined;
  } catch {
    return undefined;
  }
};

const fetchWithTimeout = async (
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const getAuthHeaders = async (
  ctx: ExtensionContext
): Promise<Record<string, string> | undefined> => {
  const seen = new Set<string>();
  const candidates: (RegistryModel | undefined)[] = [
    ctx.model,
    ...ctx.modelRegistry.getAvailable(),
    ...ctx.modelRegistry.getAll(),
  ];

  for (const model of candidates) {
    if (model === undefined || model.provider !== PROVIDER) {
      continue;
    }
    if (seen.has(model.id)) {
      continue;
    }
    seen.add(model.id);

    // Sequential by design: each lookup can trigger a provider token refresh.
    // oxlint-disable-next-line no-await-in-loop
    const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
    if (!auth.ok) {
      continue;
    }

    const headers: Record<string, string> = Object.fromEntries(
      Object.entries(auth.headers ?? {}).filter(
        (entry): entry is [string, string] => entry[1] !== null
      )
    );
    if (
      !hasHeader(headers, "Authorization") &&
      auth.apiKey !== undefined &&
      auth.apiKey !== ""
    ) {
      headers.Authorization = `Bearer ${auth.apiKey}`;
    }
    if (
      !hasHeader(headers, "chatgpt-account-id") &&
      auth.apiKey !== undefined &&
      auth.apiKey !== ""
    ) {
      const accountId = extractAccountId(auth.apiKey);
      if (accountId !== undefined) {
        headers["chatgpt-account-id"] = accountId;
      }
    }
    if (!hasHeader(headers, "originator")) {
      headers.originator = "pi";
    }
    if (hasHeader(headers, "Authorization")) {
      return headers;
    }
  }

  return undefined;
};

const findWeeklyWindow = (response: UsageResponse): UsageWindow | undefined => {
  const rateLimit = response.rate_limit;
  if (rateLimit === undefined) {
    return undefined;
  }

  const windows = [rateLimit.primary_window, rateLimit.secondary_window].filter(
    (window): window is UsageWindow => window !== undefined && window !== null
  );
  return (
    windows.find(
      (window) => numberValue(window.limit_window_seconds) === WEEK_SECONDS
    ) ?? windows.at(-1)
  );
};

const formatReset = (epochSeconds: number): string => {
  const remainingMinutes = Math.max(
    0,
    Math.floor((epochSeconds * 1000 - Date.now()) / 60_000)
  );
  const days = Math.floor(remainingMinutes / (24 * 60));
  const hours = Math.floor((remainingMinutes % (24 * 60)) / 60);
  if (days > 0) {
    return `${days}d${hours > 0 ? `${hours}h` : ""}`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${remainingMinutes}m`;
};

const formatWeeklyUsage = (window: UsageWindow): string => {
  const used = numberValue(window.used_percent);
  if (used === undefined) {
    throw new Error("weekly usage missing");
  }

  const remaining = Math.max(0, Math.min(100, 100 - used));
  const resetAt = numberValue(window.reset_at);
  const reset = resetAt === undefined ? "" : ` [${formatReset(resetAt)}]`;
  return `CX ${remaining.toFixed(0)}%${reset}`;
};

export default function codexWeeklyUsage(pi: ExtensionAPI) {
  let requestId = 0;
  let active = false;

  const stop = () => {
    active = false;
    requestId += 1;
  };

  const refresh = async (ctx: ExtensionContext) => {
    if (!active) {
      return;
    }
    requestId += 1;
    const currentRequest = requestId;

    try {
      const headers = await getAuthHeaders(ctx);
      if (headers === undefined) {
        ctx.ui.setStatus(STATUS_KEY, undefined);
        return;
      }

      const response = await fetchWithTimeout(
        USAGE_URL,
        { headers },
        REQUEST_TIMEOUT_MS
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const parsed: unknown = await response.json();
      if (!isUsageResponse(parsed)) {
        throw new Error("unexpected usage response");
      }

      const weekly = findWeeklyWindow(parsed);
      if (weekly === undefined) {
        throw new Error("weekly window missing");
      }

      if (active && currentRequest === requestId) {
        ctx.ui.setStatus(STATUS_KEY, formatWeeklyUsage(weekly));
      }
    } catch {
      if (active && currentRequest === requestId) {
        ctx.ui.setStatus(STATUS_KEY, "Codex wk: unavailable");
      }
    }
  };

  pi.on("session_start", (_event, ctx) => {
    active = true;
    void refresh(ctx);
  });

  pi.on("agent_settled", (_event, ctx) => {
    void refresh(ctx);
  });

  pi.on("session_shutdown", (_event, ctx) => {
    stop();
    ctx.ui.setStatus(STATUS_KEY, undefined);
  });
}
