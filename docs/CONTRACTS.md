# Contracts between teams

Everything the two teams may depend on from each other. If it is not here, do not depend on it.

## 1. Domain events (`apps/core/events.py`)

Emit with `emit(events.<name>, sender=<ServiceClass>, **payload)`. Delivery happens **after the transaction commits**.
Payloads carry **ids and primitives only** (UUIDs, strings), never model instances. Receivers load what they need through selectors.

| Event | Emitted by (team) | Payload | Consumed by |
|---|---|---|---|
| `placement_submitted` | PlacementService (Alpha) | `placement_id`, `actor_id` | notifications: email coordinators |
| `placement_approved` | PlacementService (Alpha) | `placement_id`, `actor_id` | notifications: email student and both supervisors |
| `placement_returned` | PlacementService (Alpha) | `placement_id`, `actor_id`, `remarks` | notifications: email student |
| `placement_rejected` | PlacementService (Alpha) | `placement_id`, `actor_id`, `remarks` | notifications: email student |
| `workplace_supervisor_invited` | UserService (Alpha) | `user_id`, `placement_id` | notifications: set-password email |
| `logbook_submitted` | LogbookService (Beta) | `entry_id`, `placement_id`, `actor_id` | notifications: email workplace supervisor |
| `logbook_approved` | LogbookService (Beta) | `entry_id`, `placement_id`, `actor_id` | notifications: email student |
| `logbook_returned` | LogbookService (Beta) | `entry_id`, `placement_id`, `actor_id`, `comment` | notifications: email student |
| `feedback_added` | LogbookService (Beta) | `entry_id`, `placement_id`, `actor_id` | notifications: email student |
| `review_overdue` | logbook tasks (Beta) | `entry_id`, `placement_id`, `level` (`reminder` or `escalation`) | notifications |
| `week_missing` | logbook tasks (Beta) | `placement_id`, `week_start` | notifications |
| `visit_scheduled` | VisitService (Beta) | `visit_id`, `placement_id`, `actor_id` | notifications |
| `final_report_submitted` | FinalReportService (Alpha) | `placement_id`, `report_id`, `actor_id` | notifications: email academic supervisor |
| `final_report_accepted` | FinalReportService (Alpha) | `placement_id`, `report_id`, `actor_id` | notifications: email student |
| `final_report_returned` | FinalReportService (Alpha) | `placement_id`, `report_id`, `actor_id`, `feedback` | notifications: email student |
| `result_finalized` | ResultService (Alpha) | `placement_id`, `actor_id` | notifications: email student |
| `notice_posted` | NoticeService (Beta) | `notice_id`, `actor_id` | notifications: email audience when `send_email` |

## 2. Selectors (public read API of an app)

Stubs with these signatures exist in each app's `selectors.py` and raise `NotImplementedError` until the owner implements them.
Consumers mock them in tests until then.

### Exposed by Alpha

| Selector | Returns | Used by |
|---|---|---|
| `accounts.selectors.get_user(user_id)` | user or `None` | notifications, logbook |
| `accounts.selectors.users_with_role(role)` | queryset | notifications (coordinator emails) |
| `placements.selectors.get_placement(placement_id)` | placement or `None` | logbook, visits |
| `placements.selectors.placement_participants(placement_id)` | `Participants(student, academic_supervisor, workplace_supervisor)` | notifications, logbook |
| `placements.selectors.placements_visible_to(user)` | role-scoped queryset | logbook, visits (scoping) |
| `placements.selectors.open_placements_on(date)` | queryset of `APPROVED` placements active on that date | logbook tasks (missing weeks) |
| `placements.selectors.can_log_on(placement_id, date)` | bool | logbook services |

### Exposed by Beta

| Selector | Returns | Used by |
|---|---|---|
| `logbook.selectors.pending_reviews_for_supervisor(user)` | queryset or list of entries awaiting review (oldest first, overdue marked) | reports (workplace dashboard) |
| `logbook.selectors.approved_hours_by_placement(placement_ids)` | `dict[placement_id, Decimal]` | reports, assessments |
| `logbook.selectors.weeks_summary_by_placement(placement_ids)` | `dict[placement_id, WeeksSummary]` (approved, submitted, returned, missing, expected) | reports |
| `logbook.selectors.recent_feedback_for_student(user, limit=5)` | list | reports (student dashboard) |
| `logbook.selectors.open_flags_for_user(user)` | queryset or list of unresolved flags in the user's scope | reports |
| `visits.selectors.upcoming_visits_for(user, limit=5)` | list | reports |
| `visits.selectors.completed_visit_counts(placement_ids)` | `dict[placement_id, int]` | reports |
| `notices.selectors.notices_visible_to(user)` | queryset | reports (all dashboards) |

## 3. URL ownership (all under `/api/v1/`)

Each app registers only the prefixes below, in its own `urls.py`. Overlap is a bug.

| App | Prefixes |
|---|---|
| accounts | `auth/`, `users/`, `supervisors/` |
| placements | `periods/`, `organizations/`, `placements/` (list, detail, actions, `timeline/`) |
| logbook | `placements/{id}/logbook/`, `logbook/`, `flags/` |
| visits | `visits/`, `placements/{id}/visits/` |
| assessments | `periods/{id}/assessment-forms/`, `assessment-forms/`, `placements/{id}/assessments/`, `assessments/`, `placements/{id}/final-report/`, `final-reports/`, `placements/{id}/result/`, `placements/{id}/finalize/` |
| notices | `notices/` |
| notifications | none (email only) |
| reports | `dashboard/`, `placements/{id}/summary/`, `reports/` |

## 4. Shared conventions (from `apps/core`)

| Topic | Rule |
|---|---|
| Roles | `apps.core.enums.Role`: `STUDENT`, `WORKPLACE_SUPERVISOR`, `ACADEMIC_SUPERVISOR`, `COORDINATOR` |
| Base models | `BaseModel` (UUID id, timestamps), `SoftDeleteModel` |
| Errors | Raise `DomainError` subclasses from services (`RuleViolation` 422, `InvalidTransition` 409). The API returns `{code, message, details}` |
| Pagination | `StandardPagination` (`page`, `page_size`, max 100) |
| Viewsets | Subclass `ScopedModelViewSet`; implement `get_scoped_queryset()` with a selector. Never `queryset = Model.objects.all()` |
| Permissions | `apps.core.permissions.roles_required(...)` plus object-level checks through selectors |
| Files | `DatedUploadPath(category)` for `upload_to`; `serve_stored_file()` for downloads; validators in `core.validators` |
| Time | UTC in the database (`USE_TZ=True`); `timezone.now()`, never `datetime.now()` |
| Tests | Fixtures in `backend/conftest.py`; factories live in the owning app's `tests/factories.py` |
## 5. Updates from Team Alpha milestone M1-M4
- All Alpha selectors listed in section 2 are now implemented (accounts, placements).
- Beta selectors should return JSON-friendly data (dicts, or objects with plain attributes). Dashboards degrade gracefully while a Beta selector still raises NotImplementedError: the widget is empty and the selector name appears in the dashboard's `unavailable` list.
- Expected keys: feedback items need `id, entry_id, placement_id, author, comment, created_at`; flags need `id, placement_id, type, detail`; visits need `id, placement_id, scheduled_at, mode`; notices need `id, title, body, pinned, publish_at`; pending reviews need `id, placement_id, student, week_start, submitted_at, overdue`.
- Account set-password emails are sent by accounts itself (invited users get a random unusable-by-humans password, so the normal reset flow works). `workplace_supervisor_invited` is informational.
- Assessment forms lock when the first assessment (draft or submitted) is created against them; edit by creating a new version.
- Placement selectors added: periods_visible_to, get_period, latest_period, grade_bands_for, organizations_visible_to, latest_placement_for_student, placements_in_period, placement_timeline.
## 6. Reports app (Team Alpha)
- Dashboards read Beta only through selectors. While one raises NotImplementedError the widget is empty and the selector name is listed in the response's `unavailable`.
- Beta selectors should return dicts (or plain objects). Needed keys: pending reviews `id, placement_id, student, week_start, submitted_at, overdue`; feedback `id, entry_id, placement_id, author, comment, created_at`; flags `id, placement_id, type, detail`; visits `id, placement_id, scheduled_at, mode`; notices `id, title, body, pinned, publish_at`.
- `weeks_summary_by_placement` values need `approved, submitted, returned, missing, expected` (dict or object). `approved_hours_by_placement` and `completed_visit_counts` map placement id to a number.
- All cross-app access of the reports app is isolated in backend/apps/reports/sources.py.
