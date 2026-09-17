import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";

const PROVIDER = "opencode-go";
const STATUS_KEY = "opencode-go-usage";
const REQUEST_TIMEOUT_MS = 15 * 1000;
const USAGE_URL = "https://opencode.ai/zen/go/v1/usage";
const WINDOW_NAMES = ["rolling", "weekly", "monthly"] as const;

/** The model type the registry accepts, derived so pi-ai stays a transitive dep. */
type RegistryModel = Parameters<
  ExtensionContext["modelRegistry"]["getApiKeyAndHeaders"]
>[0];

type UsageWindowName = (typeof WINDOW_NAMES)[number];

interface UsageWindow {
  percent: number;
  resetsAt: string;
}

type Usage = Partial<Record<UsageWindowName, UsageWindow>>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isWindowName = (name: string): name is UsageWindowName =>
  WINDOW_NAMES.some((windowName) => windowName === name);

const isUsageWindow = (value: unknown): value is UsageWindow =>
  isObject(value) &&
  typeof value.percent === "number" &&
  Number.isFinite(value.percent) &&
  typeof value.resetsAt === "string";

const parseUsage = (response: unknown): Usage => {
  if (!isObject(response)) {
    return {};
  }

  const { usage } = response;
  if (!isObject(usage)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(usage).filter(
      (entry): entry is [UsageWindowName, UsageWindow] =>
        isWindowName(entry[0]) && isUsageWindow(entry[1])
    )
  );
};

const remainingPercent = (window: UsageWindow): string =>
  Math.max(0, Math.min(100, 100 - window.percent)).toFixed(0);

const formatUsage = (usage: Usage): string => {
  const windows = [
    ["R", usage.rolling],
    ["W", usage.weekly],
    ["M", usage.monthly],
  ] as const;
  const formatted = windows.flatMap(([label, window]) =>
    window === undefined ? [] : [`${label}${remainingPercent(window)}%`]
  );
  return `GO ${formatted.join(" ")}`;
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

const getApiKey = async (
  ctx: ExtensionContext
): Promise<string | undefined> => {
  const candidates: (RegistryModel | undefined)[] = [
    ctx.model,
    ...ctx.modelRegistry.getAvailable(),
    ...ctx.modelRegistry.getAll(),
  ];

  for (const model of candidates) {
    if (model === undefined || model.provider !== PROVIDER) {
      continue;
    }
    // Sequential by design: each lookup can trigger a provider token refresh.
    // oxlint-disable-next-line no-await-in-loop
    const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
    if (auth.ok && auth.apiKey !== undefined && auth.apiKey !== "") {
      return auth.apiKey;
    }
  }

  return process.env.OPENCODE_API_KEY;
};

export default function opencodeGoUsage(pi: ExtensionAPI) {
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
      const apiKey = await getApiKey(ctx);
      if (apiKey === undefined || apiKey === "") {
        ctx.ui.setStatus(STATUS_KEY, undefined);
        return;
      }

      const response = await fetchWithTimeout(
        USAGE_URL,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        },
        REQUEST_TIMEOUT_MS
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const usage = parseUsage(await response.json());
      if (
        usage.rolling === undefined &&
        usage.weekly === undefined &&
        usage.monthly === undefined
      ) {
        throw new Error("usage windows missing");
      }

      if (active && currentRequest === requestId) {
        ctx.ui.setStatus(STATUS_KEY, formatUsage(usage));
      }
    } catch {
      if (active && currentRequest === requestId) {
        ctx.ui.setStatus(STATUS_KEY, "GO: unavailable");
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
