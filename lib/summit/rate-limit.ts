type Entry = { count: number; resetAt: number };

const memoryStore = new Map<string, Entry>();

export function enforceRateLimit(
  key: string,
  options?: { limit?: number; windowMs?: number },
): { ok: boolean; retryAfterSeconds?: number } {
  const limit = options?.limit ?? 8;
  const windowMs = options?.windowMs ?? 5 * 60 * 1000;
  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || existing.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (existing.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  memoryStore.set(key, existing);
  return { ok: true };
}
