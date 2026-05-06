type RateLimitState = {
  resetAt: number;
  count: number;
};

type CheckResult = {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
};

const GLOBAL_KEY = "__ct_upload_rate_limit__";

function getStore(): Map<string, RateLimitState> {
  const g = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: Map<string, RateLimitState>;
  };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new Map<string, RateLimitState>();
  }
  return g[GLOBAL_KEY]!;
}

export function checkFixedWindowRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): CheckResult {
  const now = Date.now();
  const store = getStore();
  const current = store.get(key);
  if (!current || now >= current.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: Math.max(0, limit - 1), retryAfterMs: 0 };
  }
  if (current.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: Math.max(0, current.resetAt - now),
    };
  }
  current.count += 1;
  store.set(key, current);
  return {
    ok: true,
    remaining: Math.max(0, limit - current.count),
    retryAfterMs: 0,
  };
}
