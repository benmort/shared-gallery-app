const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw) return fallback;
  return TRUE_VALUES.has(raw.trim().toLowerCase());
}

export function isUploadV2Enabled(): boolean {
  return envBool("MOMENTS_UPLOAD_V2_ENABLED", true);
}

export function uploadParallelism(): number {
  const raw = Number.parseInt(process.env.MOMENTS_UPLOAD_PARALLELISM || "", 10);
  if (!Number.isFinite(raw)) return 3;
  return Math.max(1, Math.min(raw, 6));
}

export function uploadSessionPollMs(): number {
  const raw = Number.parseInt(process.env.MOMENTS_UPLOAD_POLL_MS || "", 10);
  if (!Number.isFinite(raw)) return 1500;
  return Math.max(500, Math.min(raw, 5000));
}

export function uploadSessionTimeoutMs(): number {
  const raw = Number.parseInt(process.env.MOMENTS_UPLOAD_TIMEOUT_MS || "", 10);
  if (!Number.isFinite(raw)) return 90_000;
  return Math.max(10_000, Math.min(raw, 10 * 60_000));
}

export function uploadRetryCount(): number {
  const raw = Number.parseInt(process.env.MOMENTS_UPLOAD_RETRY_COUNT || "", 10);
  if (!Number.isFinite(raw)) return 3;
  return Math.max(0, Math.min(raw, 7));
}

export function uploadRetryBaseDelayMs(): number {
  const raw = Number.parseInt(process.env.MOMENTS_UPLOAD_RETRY_DELAY_MS || "", 10);
  if (!Number.isFinite(raw)) return 350;
  return Math.max(100, Math.min(raw, 4000));
}
