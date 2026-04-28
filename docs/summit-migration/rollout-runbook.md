# Summit Migration Rollout Runbook

## Pre-Deploy Validation

1. Run `pnpm lint`.
2. Execute the parity checklist in `docs/summit-migration/parity-checklist.md`.
3. Validate singleton fixture integrity in `lib/summit/data/data.json` (all required domains populated).
4. Validate external survey embedding and map links.
5. Confirm moderation routes under `/moments` still work.
6. Confirm `/summit` and `/summit/*` return `404`.
7. Confirm `/summits` redirects to `/`.

## Staged Rollout

1. Deploy to preview.
2. Run stakeholder UAT on all summit routes.
3. Promote to production.
4. Monitor edge response headers and summit UI runtime health.
5. Announce broad availability once parity is confirmed.

## Rollback

If production issues are detected:

1. Redeploy a previous known-good build.
2. Verify `/` summit home and `/moments` both render.
3. Verify `/summit` and `/summit/*` still return `404`.
4. Triage logs and open follow-up fixes.
5. Re-run parity checklist before re-release.

## Operational Monitoring

- Watch for CSP violation reports (if enabled externally).
- Watch for elevated 4xx due to CSRF origin mismatch.

