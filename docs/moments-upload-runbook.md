# Moments Upload Runbook

## Scope

Operational guide for the `/moments` uploader stack:

- Client upload queue + per-file statuses
- Upload token endpoint (`/api/blob/upload`)
- Upload session APIs (`/api/photos/upload-sessions/*`)
- Manifest storage (`album-manifests/*`)
- Reconciliation cron (`/api/cron/reconcile-uploads`)

## Key SLOs

- Upload success rate >= 99% per 15m window
- Callback-to-visible latency p95 <= 15s
- Time-to-first-play (video) p95 <= 2s on healthy network
- Manifest repair required <= 1 run/day

## Incident Signals

- Repeated `blob-upload.failed` logs with class `retryable`
- Rising 429s from upload endpoints
- Upload sessions stuck with `uploading` files after TTL
- `Failed to update ... after concurrent writes` errors

## First Response Checklist

1. Confirm deployment/env changes in the last hour.
2. Check upload endpoint error classes (`retryable` vs `terminal`).
3. Check session health:
   - `GET /api/photos/upload-sessions/:id`
4. Run reconciliation:
   - `GET /api/cron/reconcile-uploads` (with `Authorization: Bearer $CRON_SECRET` if configured)
5. If consistency issues persist, run shard repair:
   - `POST /api/photos/admin/repair`
6. If abuse suspected, tighten:
   - `MOMENTS_UPLOAD_RATE_LIMIT`
   - `MOMENTS_UPLOAD_RATE_WINDOW_MS`
   - `MOMENTS_UPLOAD_BEARER_TOKEN` (optional strict gate)

## Common Failure Modes

### 1) Sessions complete slowly

- Symptom: files upload but gallery visibility lags.
- Action:
  - Check callback logs around `blob-upload.completed`.
  - Verify session `uploadedPhotoIds`.
  - Ensure reconciliation cron is running.

### 2) High 429 rate limiting

- Symptom: users hit rate limit during peak.
- Action:
  - Increase `MOMENTS_UPLOAD_RATE_LIMIT` modestly.
  - Keep window >= 60s.
  - Use Vercel edge/WAF limits for coarse-grained protection.

### 3) Manifest contention spikes

- Symptom: concurrent writes fail repeatedly.
- Action:
  - Run `POST /api/photos/admin/repair`.
  - Verify shard index (`album-manifests/index.json`) and shard count growth.
  - Lower client parallelism via `MOMENTS_UPLOAD_PARALLELISM`.

### 4) Large video upload instability

- Symptom: retries then failure on large clips.
- Action:
  - Confirm browser network and blob region health.
  - Reduce parallelism temporarily.
  - Validate session timeout (`MOMENTS_UPLOAD_TIMEOUT_MS`) is not too low.

## Rollback Plan

1. Set `MOMENTS_UPLOAD_V2_ENABLED=false`.
2. Redeploy.
3. Verify fallback multipart upload for small files.
4. Keep reconciliation cron enabled; do not delete existing session/shard blobs.

## Load Test

Use:

```bash
pnpm loadtest:uploads http://localhost:3000 20 200 250000
```

Track:

- success/failure count
- response latency
- status code distribution

## Optional Enterprise Video Path

If adaptive streaming and managed transcoding are required, evaluate Mux + Vercel:

- Keep Blob for image/media archival if desired.
- Route video uploads to Mux assets.
- Store Mux asset/playback ids in metadata layer.
