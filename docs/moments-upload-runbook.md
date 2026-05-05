# Moments Upload Hardening Runbook

## Rollout strategy

1. **Internal**
   - Set `UPLOAD_ROLLOUT_STAGE=internal`.
   - Keep `UPLOAD_DUAL_WRITE_ENABLED=true`.
   - Keep `UPLOAD_DB_READ_ENABLED=true`.
   - Keep `UPLOAD_DB_ONLY_ENABLED=false`.
2. **Limited**
   - Keep dual-write on.
   - Enable canary users only (`UPLOAD_CANARY_SAMPLE_RATE` < 1 if needed).
3. **Full**
   - Set `UPLOAD_ROLLOUT_STAGE=full`.
   - Set `UPLOAD_DB_ONLY_ENABLED=true` after at least one full event cycle of healthy canary metrics.

## Canary metrics and SLO checks

Monitor every 5 minutes during active uploads:

- `GET /api/photos/metrics`
  - `upload_failed / upload_complete < 0.02`
  - `job_dlq == 0`
- `GET /api/photos/consistency`
  - `dbOnly` and `manifestOnly` arrays should stay empty during dual-write.
- `GET /api/photos/jobs/reprocess`
  - DLQ count should stay at zero.

## Queue and maintenance operations

- Trigger processor manually:
  - `POST /api/photos/jobs/process?secret=$UPLOAD_JOB_SECRET`
- Inspect DLQ jobs:
  - `GET /api/photos/jobs/reprocess?secret=$UPLOAD_JOB_SECRET`
- Requeue DLQ item:
  - `POST /api/photos/jobs/reprocess?secret=$UPLOAD_JOB_SECRET` with `{ "uploadId": "<id>" }`
- Orphan scan:
  - `GET /api/photos/jobs/reconcile-orphans?secret=$UPLOAD_JOB_SECRET`

## Backfill and dual-write verification

1. Run `pnpm backfill:media-db`.
2. Call `GET /api/photos/consistency?secret=$UPLOAD_JOB_SECRET`.
3. Confirm no drift before enabling `UPLOAD_DB_ONLY_ENABLED=true`.

## Load test recipe

1. Point to target:
   - `BASE_URL=https://<deployment>`
2. Run:
   - `CONCURRENCY=12 TOTAL_REQUESTS=120 pnpm loadtest:moments-upload`
3. Gate:
   - p95 latency stable relative to baseline.
   - failure count is zero for warm deployments.

## Rollback drill (DB read path)

1. Set:
   - `UPLOAD_DB_ONLY_ENABLED=false`
   - `UPLOAD_DB_READ_ENABLED=false`
   - `UPLOAD_DUAL_WRITE_ENABLED=true`
2. Redeploy.
3. Verify:
   - Upload still succeeds.
   - New uploads appear via manifest-backed list path.
4. Re-enable DB read when issue is resolved.

## Alert thresholds

- **Critical**
  - `job_dlq > 0`
  - upload failure ratio > 5% over 10 minutes
- **Warning**
  - upload failure ratio > 2% over 10 minutes
  - any consistency drift (`dbOnly` or `manifestOnly` non-empty)
