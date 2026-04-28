# Summit Native-to-Web Parity Checklist

Use this checklist to validate parity with `summit-app-archived` before full cutover.

## Authentication

- [ ] Summit routes are accessible without login.
- [ ] Legacy `/summit` and `/summit/*` URLs return `404`.

## Navigation + Shell

- [ ] Summit shell renders global nav.
- [ ] App always resolves the single fixture summit context.
- [ ] Link from `/moments` to `/` (summit home) is visible.
- [ ] Link from summit shell back to `/moments` is visible.

## Domain Lists + Details

- [ ] Speakers list + speaker detail.
- [ ] Events detail reachable from schedule.
- [ ] Venues list + venue detail.
- [ ] Crew list + crew detail.
- [ ] Attractions list + attraction detail.
- [ ] Organisations list + organisation detail.
- [ ] Sponsors list + sponsor detail.
- [ ] `/summits` redirects to `/`.

## Dashboard + Schedule

- [ ] Dashboard loads summits, speakers, map.
- [ ] Upcoming speakers section renders with links.
- [ ] Schedule is grouped by day and time.
- [ ] Schedule rows open the correct details page.

## Static Content + Surveys

- [ ] Code of Conduct page renders content body.
- [ ] Security Guidelines page renders content body.
- [ ] Surveys list loads links.
- [ ] Survey detail embeds URL with iframe sandbox.

## Security + Reliability

- [ ] CSP and security headers present on responses.
- [ ] Runtime errors log enough context for diagnosis.

