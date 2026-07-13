interface RateEntry {
  count: number;
  resetAt: number;
}

interface RateState {
  entries: Map<string, RateEntry>;
}

const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_RATE_LIMIT_KEYS = 10_000;
const GLOBAL_KEY = Symbol.for("fpbank.analysis-rate-limit");

function rateState(): RateState {
  const target = globalThis as typeof globalThis & { [GLOBAL_KEY]?: RateState };
  if (!target[GLOBAL_KEY]) target[GLOBAL_KEY] = { entries: new Map() };
  return target[GLOBAL_KEY];
}

export function analysisMemoryQueueEnabled(
  environment: Record<string, string | undefined> = process.env,
): boolean {
  return environment.NODE_ENV !== "production" || environment.FP_ANALYSIS_MEMORY_QUEUE_ENABLED === "true";
}

export function hasValidRequestOrigin(
  request: Request,
  environment: Record<string, string | undefined> = process.env,
): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return environment.NODE_ENV !== "production"
      || environment.FP_ANALYSIS_ALLOW_NON_BROWSER === "true";
  }
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || new URL(request.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "local";
}

export function consumeAnalysisRateLimit(request: Request, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
  const state = rateState();
  const key = clientKey(request);
  for (const [storedKey, entry] of state.entries) {
    if (now >= entry.resetAt) state.entries.delete(storedKey);
  }
  const current = state.entries.get(key);
  if (!current || now >= current.resetAt) {
    if (state.entries.size >= MAX_RATE_LIMIT_KEYS) {
      const oldestKey = state.entries.keys().next().value;
      if (oldestKey) state.entries.delete(oldestKey);
    }
    state.entries.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= RATE_LIMIT) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  state.entries.delete(key);
  state.entries.set(key, current);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function analysisRateLimitKeyCountForTests(): number {
  return rateState().entries.size;
}

export function clearAnalysisRateLimitsForTests(): void {
  rateState().entries.clear();
}
