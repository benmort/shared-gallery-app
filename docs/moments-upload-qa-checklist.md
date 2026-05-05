# Moments Upload QA Checklist

## Integration coverage

- [ ] Run `pnpm test` and verify:
  - `tests/moments/upload-route.test.ts`
  - `tests/moments/upload-ux.test.ts`

## Manual mixed-media upload checks

- [ ] Upload 1 image + 1 video together from the queue.
- [ ] Confirm each queue item shows `uploading` spinner then `done` check icon.
- [ ] Confirm remove buttons are hidden while upload is active.
- [ ] Confirm failed item shows retry button.
- [ ] Confirm `Clear completed` removes only finished queue items.

## Load and resilience checks

- [ ] Run `CONCURRENCY=12 TOTAL_REQUESTS=120 pnpm loadtest:moments-upload`.
- [ ] Verify no failures and acceptable p95 latency.
- [ ] Trigger `/api/photos/jobs/process` and verify queue drains.
- [ ] Confirm DLQ remains empty in `/api/photos/jobs/reprocess`.

## Rollback drill (feature flag reversion)

- [ ] Set `UPLOAD_DB_ONLY_ENABLED=false` and `UPLOAD_DB_READ_ENABLED=false`.
- [ ] Keep `UPLOAD_DUAL_WRITE_ENABLED=true`.
- [ ] Deploy and verify uploads still appear in Moments gallery.
- [ ] Re-enable DB reads and compare consistency endpoint output.
