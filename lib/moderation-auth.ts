import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const COOKIE = "ct_mod";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret(): string | null {
  const s = process.env.MODERATION_SECRET;
  if (!s || s.length < 16) return null;
  return s;
}

export function signModerationSession(): string {
  const secret = getSecret();
  if (!secret) {
    throw new Error("MODERATION_SECRET must be set (min 16 chars) for moderation login");
  }
  const exp = Date.now() + MAX_AGE_MS;
  const nonce = randomBytes(8).toString("hex");
  const payload = Buffer.from(JSON.stringify({ exp, nonce }), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyModerationToken(token: string): boolean {
  try {
    const secret = getSecret();
    if (!secret) return false;
    const i = token.lastIndexOf(".");
    if (i <= 0) return false;
    const payload = token.slice(0, i);
    const sig = token.slice(i + 1);
    const expected = createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { exp: number };
    return typeof parsed.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export function verifyModerationPassword(password: string): boolean {
  const expected = process.env.MODERATION_PASSWORD;
  if (!expected || expected.length < 8) {
    return false;
  }
  const a = Buffer.from(password, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isModerationConfigured(): boolean {
  return !!(
    process.env.MODERATION_SECRET &&
    process.env.MODERATION_SECRET.length >= 16 &&
    process.env.MODERATION_PASSWORD &&
    process.env.MODERATION_PASSWORD.length >= 8
  );
}

export const moderationCookieName = COOKIE;

export function moderationCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(MAX_AGE_MS / 1000),
  };
}
