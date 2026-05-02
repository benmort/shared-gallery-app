# Summit Web Architecture

## Route Structure

- Summit-first root routes (via `app/(summit)`):
  - `/` dashboard
  - `/schedule`
  - `/speakers` + `/speakers/[id]`
  - `/events` + `/events/[id]`
  - `/venues` + `/venues/[id]`
  - `/crew` + `/crew/[id]`
  - `/attractions` + `/attractions/[id]`
  - `/organisations` + `/organisations/[id]`
  - `/sponsors` + `/sponsors/[id]`
  - `/surveys` + `/surveys/[id]`
  - `/code-conduct`
  - `/security-guidelines`
- Existing gallery route remains at `/moments`.
- Legacy `/summit` route tree is removed; `/summit...` URLs should 404.

## Data Layer

- Source of truth: `lib/summit/service.ts`.
- Summit data is loaded from a single local fixture: `lib/summit/data/data.json`.
- `lib/summit/stub-data.ts` normalizes the fixture and provides typed accessors.
- Singleton context:
  - `lib/summit/context.ts` resolves the first (and only) summit from fixture data.
  - No summit selection cookie or selection API is used.

## Authentication

- No summit auth layer.
- No OTP/session or attendee/profile mutation routes.

## Security Controls

- Security response headers configured in `next.config.ts`.

## UI Components

- Summit shell and nav:
  - `components/summit/SummitShell.tsx`
  - `components/summit/SummitNav.tsx`
- Reusable records UI:
  - `components/summit/SummitListCard.tsx`
  - `components/summit/SummitDetailView.tsx`
  - `components/summit/SummitDomainListPage.tsx`
  - `components/summit/SummitDomainDetailPage.tsx`

