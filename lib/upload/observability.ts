import { randomUUID } from "crypto";
import { appendPipelineEvent, dbConfigured } from "@/lib/storage/postgres-metadata";

type UploadMetricEvent =
  | "upload_init"
  | "upload_progress"
  | "upload_complete"
  | "upload_failed"
  | "reconcile"
  | "job_enqueued"
  | "job_completed"
  | "job_failed"
  | "job_dlq";

type MetricsSnapshot = Record<UploadMetricEvent, number>;

const DEFAULT_SNAPSHOT: MetricsSnapshot = {
  upload_init: 0,
  upload_progress: 0,
  upload_complete: 0,
  upload_failed: 0,
  reconcile: 0,
  job_enqueued: 0,
  job_completed: 0,
  job_failed: 0,
  job_dlq: 0,
};

const g = globalThis as typeof globalThis & {
  __uploadMetricsSnapshot?: MetricsSnapshot;
};

if (!g.__uploadMetricsSnapshot) {
  g.__uploadMetricsSnapshot = { ...DEFAULT_SNAPSHOT };
}

function bump(event: UploadMetricEvent) {
  g.__uploadMetricsSnapshot![event] += 1;
}

export function getUploadMetricsSnapshot(): MetricsSnapshot {
  return { ...g.__uploadMetricsSnapshot! };
}

export function newCorrelationId(): string {
  return randomUUID();
}

export async function trackUploadEvent(input: {
  uploadId: string;
  event: UploadMetricEvent;
  level?: "info" | "warn" | "error";
  correlationId?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  bump(input.event);
  const body = {
    ts: new Date().toISOString(),
    event: input.event,
    uploadId: input.uploadId,
    correlationId: input.correlationId,
    ...input.payload,
  };
  if (input.level === "error") {
    console.error("[moments-upload]", body);
  } else if (input.level === "warn") {
    console.warn("[moments-upload]", body);
  } else {
    console.info("[moments-upload]", body);
  }
  if (!dbConfigured()) return;
  try {
    await appendPipelineEvent({
      uploadId: input.uploadId,
      eventType: input.event,
      level: input.level,
      payload: {
        correlationId: input.correlationId,
        ...(input.payload ?? {}),
      },
    });
  } catch {
    // Observability failures must never break uploads.
  }
}
