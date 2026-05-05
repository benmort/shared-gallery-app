-- Moments upload hardening schema.
-- Apply in Postgres-compatible DB before enabling DB-backed read paths.

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
);

CREATE INDEX IF NOT EXISTS media_assets_uploaded_at_idx
  ON media_assets (uploaded_at DESC);

CREATE INDEX IF NOT EXISTS media_assets_processing_status_idx
  ON media_assets (processing_status);

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
);

CREATE INDEX IF NOT EXISTS media_jobs_run_idx
  ON media_jobs (status, next_run_at);

CREATE UNIQUE INDEX IF NOT EXISTS media_jobs_unique_active_idx
  ON media_jobs (upload_id, job_type)
  WHERE status IN ('pending', 'in_progress');

CREATE TABLE IF NOT EXISTS media_pipeline_events (
  id TEXT PRIMARY KEY,
  upload_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS media_pipeline_events_upload_idx
  ON media_pipeline_events (upload_id, created_at DESC);
