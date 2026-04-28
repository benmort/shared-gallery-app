# Native App Decommission Notes

This web migration replaces the archived native app (`summit-app-archived`) with summit routes in `summit-web`.

## Decommission Criteria

- Summit web routes pass parity checklist.
- Summit operators confirm schedule and directory workflows.
- Stakeholders sign off on survey/policy pages.

## Retirement Checklist

- [ ] Mark `summit-app-archived` read-only.
- [ ] Archive EAS channels/build docs for historical reference.
- [ ] Disable new native release pipelines.
- [ ] Update onboarding docs to point to `summit-web`.
- [ ] Update support runbooks to summit web routes.
- [ ] Migrate unresolved native issues to web backlog.

## Ownership Handover

- Product owner: summit web experience.
- Engineering owner: Next.js route stack under `app/(summit)`.
- Operations owner: summit route/API monitoring + rollout controls.

## Long-Term Maintenance

- Keep domain contracts centralized in `lib/summit/service.ts`.
- Keep summit route presentation reusable under `components/summit`.
- Avoid adding `react-native` dependencies to `summit-web`.

