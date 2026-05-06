import { checkFixedWindowRateLimit } from "@/lib/rate-limit";
import { readModerationCookie } from "@/lib/server-moderation";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function envBool(name: string): boolean {
  const raw = process.env[name];
  if (!raw) return false;
  return TRUE_VALUES.has(raw.trim().toLowerCase());
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

export async function ensureUploadAuthorized(request: Request): Promise<void> {
  const bearer = process.env.MOMENTS_UPLOAD_BEARER_TOKEN;
  if (bearer) {
    const auth = request.headers.get("authorization") || "";
    if (auth !== `Bearer ${bearer}`) {
      throw new Error("Unauthorized");
    }
  }

  if (envBool("MOMENTS_UPLOAD_REQUIRE_MODERATION")) {
    const allowed = await readModerationCookie();
    if (!allowed) {
      throw new Error("Unauthorized");
    }
  }
}

export function ensureUploadRateLimit(request: Request, namespace: string): void {
  const limit = Math.max(
    1,
    Number.parseInt(process.env.MOMENTS_UPLOAD_RATE_LIMIT || "120", 10) || 120,
  );
  const windowMs = Math.max(
    1000,
    Number.parseInt(process.env.MOMENTS_UPLOAD_RATE_WINDOW_MS || "60000", 10) || 60000,
  );
  const ip = clientIpFromRequest(request);
  const key = `${namespace}:${ip}`;
  const check = checkFixedWindowRateLimit(key, limit, windowMs);
  if (!check.ok) {
    const seconds = Math.max(1, Math.ceil(check.retryAfterMs / 1000));
    const err = new Error(`Rate limited. Retry in ${seconds}s.`);
    (err as Error & { retryAfterMs?: number }).retryAfterMs = check.retryAfterMs;
    throw err;
  }
}
