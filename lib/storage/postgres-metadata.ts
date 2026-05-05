import { randomUUID } from "crypto";
import { sql } from "@vercel/postgres";
import type { PhotoRecord, ProcessingStatus } from "../types/photo";

type JobStatus = "pending" | "in_progress" | "completed" | "dlq";

export type MediaJob = {
  id: string;
  uploadId: string;
  photoId: string;
  jobType: "process_media";
  status: JobStatus;
  attemptCount: number;
  maxAttempts: number;
  nextRunAt: string;
  payload: Record<string, unknown>;
  lastError?: string;
};

let schemaReady: Promise<void> | null = null;

function hasDbConfig(): boolean {
  return typeof process.env.POSTGRES_URL === "string" && process.env.POSTGRES_URL.length > 0;
}

export function dbConfigured(): boolean {
  return hasDbConfig();
}

function rowToRecord(row: Record<string, unknown>): PhotoRecord {
  return {
    id: String(row.id),
    uploadId: row.upload_id ? String(row.upload_id) : undefined,
    filename: String(row.filename),
    uploadedAt: new Date(String(row.uploaded_at)).toISOString(),
    storedName: String(row.stored_name),
    mime: String(row.mime),
    processingStatus: String(row.processing_status) as ProcessingStatus,
    processingError: row.processing_error ? String(row.processing_error) : undefined,
    blurDataUrl: row.blur_data_url ? String(row.blur_data_url) : undefined,
    width: typeof row.width === "number" ? row.width : undefined,
    height: typeof row.height === "number" ? row.height : undefined,
    thumbStoredName: row.thumb_stored_name ? String(row.thumb_stored_name) : undefined,
    displayStoredName: row.display_stored_name ? String(row.display_stored_name) : undefined,
  };
}

export async function ensureMediaSchema(): Promise<void> {
  if (!hasDbConfig()) return;
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS media_assets (
          id TEXT PRIMARY KEY,
          upload_id TEXT UNIQUE NOT NULL,
          filename TEXT NOT NULL,
          uploaded_at TIMESTAMPTZ NOT NULL,
          stored_name TEXT UNIQUE NOT NULL,
          mime TEXT NOT NULL,
          processing_status TEXT NOT NULL DEFAULT 'processing',
          processing_error TEXT,
          blur_data_url TEXT,
          width INTEGER,
          height INTEGER,
          thumb_stored_name TEXT,
          display_stored_name TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS media_assets_uploaded_at_idx
          ON media_assets (uploaded_at DESC)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS media_assets_processing_status_idx
          ON media_assets (processing_status)
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS media_jobs (
          id TEXT PRIMARY KEY,
          upload_id TEXT NOT NULL,
          photo_id TEXT NOT NULL,
          job_type TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          attempt_count INTEGER NOT NULL DEFAULT 0,
          max_attempts INTEGER NOT NULL DEFAULT 6,
          next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          payload JSONB NOT NULL DEFAULT '{}'::jsonb,
          last_error TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS media_jobs_run_idx
          ON media_jobs (status, next_run_at)
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS media_jobs_unique_active_idx
          ON media_jobs (upload_id, job_type)
          WHERE status IN ('pending', 'in_progress')
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS media_pipeline_events (
          id TEXT PRIMARY KEY,
          upload_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          level TEXT NOT NULL DEFAULT 'info',
          payload JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS media_pipeline_events_upload_idx
          ON media_pipeline_events (upload_id, created_at DESC)
      `;
    })();
  }
  await schemaReady;
}

export async function listMediaPaged(
  offset: number,
  limit: number,
): Promise<{ records: PhotoRecord[]; total: number }> {
  if (!hasDbConfig()) return { records: [], total: 0 };
  await ensureMediaSchema();
  const count = await sql<{ count: string }>`SELECT COUNT(*)::text AS count FROM media_assets`;
  const rows = await sql<Record<string, unknown>>`
    SELECT * FROM media_assets
    ORDER BY uploaded_at DESC
    OFFSET ${offset}
    LIMIT ${limit}
  `;
  return {
    records: rows.rows.map(rowToRecord),
    total: parseInt(count.rows[0]?.count || "0", 10),
  };
}

export async function listMediaAll(): Promise<PhotoRecord[]> {
  if (!hasDbConfig()) return [];
  await ensureMediaSchema();
  const rows = await sql<Record<string, unknown>>`
    SELECT * FROM media_assets
    ORDER BY uploaded_at DESC
  `;
  return rows.rows.map(rowToRecord);
}

export async function getMediaById(id: string): Promise<PhotoRecord | null> {
  if (!hasDbConfig()) return null;
  await ensureMediaSchema();
  const rows = await sql<Record<string, unknown>>`
    SELECT * FROM media_assets WHERE id = ${id} LIMIT 1
  `;
  if (!rows.rows[0]) return null;
  return rowToRecord(rows.rows[0]);
}

export async function getMediaByUploadId(uploadId: string): Promise<PhotoRecord | null> {
  if (!hasDbConfig()) return null;
  await ensureMediaSchema();
  const rows = await sql<Record<string, unknown>>`
    SELECT * FROM media_assets WHERE upload_id = ${uploadId} LIMIT 1
  `;
  if (!rows.rows[0]) return null;
  return rowToRecord(rows.rows[0]);
}

export async function getMediaByUploadIds(uploadIds: string[]): Promise<PhotoRecord[]> {
  if (!uploadIds.length) return [];
  if (!hasDbConfig()) return [];
  await ensureMediaSchema();
  const rows = await sql<Record<string, unknown>>`
    SELECT * FROM media_assets WHERE upload_id = ANY(${uploadIds})
  `;
  return rows.rows.map(rowToRecord);
}

export async function upsertMediaRecord(record: PhotoRecord): Promise<void> {
  if (!hasDbConfig()) return;
  await ensureMediaSchema();
  await sql`
    INSERT INTO media_assets (
      id,
      upload_id,
      filename,
      uploaded_at,
      stored_name,
      mime,
      processing_status,
      processing_error,
      blur_data_url,
      width,
      height,
      thumb_stored_name,
      display_stored_name,
      updated_at
    ) VALUES (
      ${record.id},
      ${record.uploadId || record.id},
      ${record.filename},
      ${record.uploadedAt},
      ${record.storedName},
      ${record.mime},
      ${record.processingStatus ?? "done"},
      ${record.processingError ?? null},
      ${record.blurDataUrl ?? null},
      ${record.width ?? null},
      ${record.height ?? null},
      ${record.thumbStoredName ?? null},
      ${record.displayStoredName ?? null},
      NOW()
    )
    ON CONFLICT (upload_id)
    DO UPDATE SET
      id = EXCLUDED.id,
      filename = EXCLUDED.filename,
      uploaded_at = EXCLUDED.uploaded_at,
      stored_name = EXCLUDED.stored_name,
      mime = EXCLUDED.mime,
      processing_status = EXCLUDED.processing_status,
      processing_error = EXCLUDED.processing_error,
      blur_data_url = EXCLUDED.blur_data_url,
      width = EXCLUDED.width,
      height = EXCLUDED.height,
      thumb_stored_name = EXCLUDED.thumb_stored_name,
      display_stored_name = EXCLUDED.display_stored_name,
      updated_at = NOW()
  `;
}

export async function deleteMediaRecord(id: string): Promise<void> {
  if (!hasDbConfig()) return;
  await ensureMediaSchema();
  await sql`DELETE FROM media_assets WHERE id = ${id}`;
}

export async function enqueueProcessingJob(input: {
  uploadId: string;
  photoId: string;
  payload?: Record<string, unknown>;
  maxAttempts?: number;
}): Promise<void> {
  if (!hasDbConfig()) return;
  await ensureMediaSchema();
  const id = randomUUID();
  await sql`
    INSERT INTO media_jobs (
      id,
      upload_id,
      photo_id,
      job_type,
      status,
      attempt_count,
      max_attempts,
      next_run_at,
      payload
    ) VALUES (
      ${id},
      ${input.uploadId},
      ${input.photoId},
      'process_media',
      'pending',
      0,
      ${input.maxAttempts ?? 6},
      NOW(),
      ${JSON.stringify(input.payload ?? {})}::jsonb
    )
    ON CONFLICT DO NOTHING
  `;
}

export async function claimProcessingJobs(limit: number): Promise<MediaJob[]> {
  if (!hasDbConfig()) return [];
  await ensureMediaSchema();
  const rows = await sql<Record<string, unknown>>`
    UPDATE media_jobs j
    SET status = 'in_progress',
        updated_at = NOW()
    WHERE j.id IN (
      SELECT id
      FROM media_jobs
      WHERE status = 'pending'
        AND next_run_at <= NOW()
      ORDER BY next_run_at ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `;
  return rows.rows.map((row) => ({
    id: String(row.id),
    uploadId: String(row.upload_id),
    photoId: String(row.photo_id),
    jobType: "process_media",
    status: String(row.status) as JobStatus,
    attemptCount: Number(row.attempt_count ?? 0),
    maxAttempts: Number(row.max_attempts ?? 6),
    nextRunAt: new Date(String(row.next_run_at)).toISOString(),
    payload: (row.payload as Record<string, unknown>) ?? {},
    lastError: row.last_error ? String(row.last_error) : undefined,
  }));
}

export async function markJobCompleted(id: string): Promise<void> {
  if (!hasDbConfig()) return;
  await ensureMediaSchema();
  await sql`
    UPDATE media_jobs
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function markJobFailed(input: {
  id: string;
  attemptCount: number;
  maxAttempts: number;
  error: string;
}): Promise<"pending" | "dlq"> {
  if (!hasDbConfig()) return "pending";
  await ensureMediaSchema();
  const nextAttempt = input.attemptCount + 1;
  if (nextAttempt >= input.maxAttempts) {
    await sql`
      UPDATE media_jobs
      SET status = 'dlq',
          attempt_count = ${nextAttempt},
          last_error = ${input.error},
          updated_at = NOW()
      WHERE id = ${input.id}
    `;
    return "dlq";
  }
  const delaySeconds = Math.min(300, 5 * 2 ** Math.min(nextAttempt, 6));
  await sql`
    UPDATE media_jobs
    SET status = 'pending',
        attempt_count = ${nextAttempt},
        last_error = ${input.error},
        next_run_at = NOW() + (${delaySeconds} * INTERVAL '1 second'),
        updated_at = NOW()
    WHERE id = ${input.id}
  `;
  return "pending";
}

export async function reprocessDlqJob(uploadId: string): Promise<boolean> {
  if (!hasDbConfig()) return false;
  await ensureMediaSchema();
  const rows = await sql`
    UPDATE media_jobs
    SET status = 'pending',
        attempt_count = 0,
        next_run_at = NOW(),
        updated_at = NOW(),
        last_error = NULL
    WHERE upload_id = ${uploadId}
      AND status = 'dlq'
    RETURNING id
  `;
  return rows.rows.length > 0;
}

export async function listDlqJobs(limit: number): Promise<MediaJob[]> {
  if (!hasDbConfig()) return [];
  await ensureMediaSchema();
  const rows = await sql<Record<string, unknown>>`
    SELECT *
    FROM media_jobs
    WHERE status = 'dlq'
    ORDER BY updated_at DESC
    LIMIT ${limit}
  `;
  return rows.rows.map((row) => ({
    id: String(row.id),
    uploadId: String(row.upload_id),
    photoId: String(row.photo_id),
    jobType: "process_media",
    status: "dlq",
    attemptCount: Number(row.attempt_count ?? 0),
    maxAttempts: Number(row.max_attempts ?? 6),
    nextRunAt: new Date(String(row.next_run_at)).toISOString(),
    payload: (row.payload as Record<string, unknown>) ?? {},
    lastError: row.last_error ? String(row.last_error) : undefined,
  }));
}

export async function appendPipelineEvent(input: {
  uploadId: string;
  eventType: string;
  level?: "info" | "warn" | "error";
  payload?: Record<string, unknown>;
}): Promise<void> {
  if (!hasDbConfig()) return;
  await ensureMediaSchema();
  await sql`
    INSERT INTO media_pipeline_events (
      id,
      upload_id,
      event_type,
      level,
      payload
    ) VALUES (
      ${randomUUID()},
      ${input.uploadId},
      ${input.eventType},
      ${input.level ?? "info"},
      ${JSON.stringify(input.payload ?? {})}::jsonb
    )
  `;
}
