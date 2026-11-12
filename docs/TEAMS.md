# Team Alpha and Team Beta

## Ownership

| Team | Focus | Apps |
|---|---|---|
| **Alpha** (chief surgeon: platform and DevOps) | Programme lifecycle and identity | `core`, `accounts`, `placements`, `assessments`, `reports`, plus `config/`, Docker, CI/CD, `infra/` |
| **Beta** (assistant surgeon) | Daily activity and communication | `logbook`, `visits`, `notices`, `notifications` |

`CODEOWNERS` encodes this; turn on "Require review from Code Owners" in branch protection.

## Rules of engagement (and how each is enforced)

| # | Rule | Enforcement |
|---|---|---|
| 1 | **Cross-team logic goes through domain events.** Alpha services call `emit(events.placement_approved, ...)`. Beta's `notifications/receivers.py` listens. Beta never imports Alpha's `services.py`. | `apps/core/events.py` defines every signal and dispatches only after commit. `import-linter` contract #1 fails CI if Beta imports Alpha services or `reports`. |
| 2 | **Reads across teams go through selectors.** Alpha's dashboards import `logbook.selectors`, never `logbook.models`. | Selector signatures are pre-declared as stubs in each app (`NotImplementedError` until implemented). `import-linter` contract #2 fails CI if Alpha imports Beta models, services, serializers or views. |
| 3 | **Isolated routes.** Each app owns its `urls.py`. `config/urls.py` and `config/api_v1.py` are pre-wired for all nine apps, so nobody edits them. | Nine `include()` lines already exist; PR template and CODEOWNERS flag edits to `config/`. |
| 4 | **Parallel development with mocks.** Beta builds against `factory-boy` factories, not Alpha's finished APIs. | `accounts/tests/factories.py` ships now; Alpha adds `PlacementFactory` and `ApprovedPlacementFactory` in milestone M1. Fixtures for every role are in `backend/conftest.py`. |

### No shared-file edits needed

| Need | Do this (own app only) |
|---|---|
| Periodic task | Add `apps/<app>/schedule.py` with `BEAT_SCHEDULE = {...}` (no model imports). It is collected automatically. |
| Demo data | Add `apps/<app>/seed.py` with `def seed():`. `make seed` runs every app's hook. |
| Event reaction | Add a function with `@receiver(signal)` in `apps/notifications/receivers.py` (Beta). |
| Celery queue | Task names under `apps.notifications.*` and `apps.reports.*` route to their own queues automatically. |
| New dependency | PR to `backend/requirements/*.txt`; Alpha reviews. |

## Milestones (contract first)

| Milestone | Owner | Deliverable | Unblocks |
|---|---|---|---|
| **M0** | Alpha | This scaffold: Docker, CI, settings, `core`, app skeletons, import rules | Everyone |
| **M1** | Alpha | `accounts.User` (done in scaffold) plus profiles; `placements` models and migration (`Placement`, `Organization`, `InternshipPeriod`) with `PlacementFactory` and `ApprovedPlacementFactory`; implemented selectors `get_placement`, `placement_participants`, `placements_visible_to` | Beta can build logbook against real tables |
| **M2** | Beta (parallel) | `logbook` models, rules, services, API using factories and `ApprovedPlacementFactory` | |
| **M2** | Alpha (parallel) | `placements` state machine and API; emits events | |
| **M3** | Alpha | `assessments` (rubric as data, scoring, final report, finalize) | |
| **M3** | Beta | `notifications` receivers for all events; review SLA and missing-week tasks; `visits`; `notices` | |
| **M4** | Alpha | `reports`: four dashboards and period summary, consuming Beta selectors | |
| **M5** | Both | Postman folders per module, permission matrix tests, hardening | Release |

## Working agreements

- Branches: `alpha/<topic>`, `beta/<topic>`; PRs into `develop`; releases tagged `vX.Y.Z` from `main`.
- Each team owns the migrations of its own apps. Cross-app foreign keys use string references (`"placements.Placement"`).
- A change to an event payload or selector signature is a **contract change**: update `docs/CONTRACTS.md` in the same PR and tell the other team.
- Definition of done: tests, permissions tested (wrong role 403, other user's record 404), Swagger reads well, `make lint test` green.
