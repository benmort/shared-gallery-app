type RolloutStage = "legacy" | "internal" | "limited" | "full";

function envBool(value: string | undefined, fallback: boolean): boolean {
  if (typeof value !== "string") return fallback;
  const v = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return fallback;
}

function hasDb(): boolean {
  return typeof process.env.POSTGRES_URL === "string" && process.env.POSTGRES_URL.length > 0;
}

export function uploadRolloutStage(): RolloutStage {
  const v = process.env.UPLOAD_ROLLOUT_STAGE?.trim().toLowerCase();
  if (v === "legacy" || v === "internal" || v === "limited" || v === "full") {
    return v;
  }
  return hasDb() ? "internal" : "legacy";
}

export function uploadDualWriteEnabled(): boolean {
  if (!hasDb()) return false;
  return envBool(process.env.UPLOAD_DUAL_WRITE_ENABLED, true);
}

export function uploadDbReadEnabled(): boolean {
  if (!hasDb()) return false;
  return envBool(process.env.UPLOAD_DB_READ_ENABLED, uploadRolloutStage() !== "legacy");
}

export function uploadDbOnlyEnabled(): boolean {
  if (!hasDb()) return false;
  return envBool(process.env.UPLOAD_DB_ONLY_ENABLED, uploadRolloutStage() === "full");
}

export function uploadProcessingQueueEnabled(): boolean {
  if (!hasDb()) return false;
  return envBool(process.env.UPLOAD_PROCESSING_QUEUE_ENABLED, true);
}

export function uploadCanarySamplingRate(): number {
  const raw = process.env.UPLOAD_CANARY_SAMPLE_RATE;
  if (!raw) return 1;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(0, Math.min(1, parsed));
}
