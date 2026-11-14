# Student Internship & Attachment Management System (SIAMS)
### Backend Design Document v2: Django + DRF (React web app, designed separately)

> Scope: **design only**: features, structure, models, flows, API contract, DevOps and testing. Code is not written here, except the infrastructure files (Docker, compose, CI) requested earlier.

---

## 0. What Changed from v1

| Topic | v1 | v2 (this document) |
|---|---|---|
| Client | Mobile-friendly | **Web app**, internet connectivity assumed |
| Geofenced attendance, sites, GPS flags | In MVP | **Removed from MVP, deferred** (section 19). The `attendance` app and `Site` model are gone. |
| Placement | Coordinator creates and assigns | **Student submits host organisation details, coordinator approves and assigns supervisors**, student tracks approval |
| Logbook | Daily entry per attended day | **Weekly logbook** made of daily lines (date, hours, activity), optional **images**, supervisor feedback |
| Hours | Computed from check-in/out | **Student declares, workplace supervisor verifies** per day on approval; only approved hours count |
| Assessment | Fixed criteria idea | **Rubric stored as data** (versioned forms imported from the institution's official form), pluggable scoring |
| Final report | Not included | **Student uploads final report**, academic supervisor accepts or returns it |
| Notices | Not included | **Coordinator posts notices** by audience |
| Dashboards | Not included | **One dashboard per role** (section 9) |
| In-app notifications | Model and endpoints | Dropped for simplicity: **email + dashboard "action required" lists** (in-app bell can be added later through a new channel) |
| Files | Excluded | **Logbook images and final report** only. Dev: `backend/media/` grouped by day. Production: **`django-storages`**, backend selectable by env var |
| Workplace supervisors | Not decided | **One per placement** (confirmed) |

---

## 1. Purpose and Guiding Principles

| # | Problem in the manual process | How SIAMS removes it |
|---|---|---|
| 1 | Delayed supervision, human error | Automatic reminders and escalation when a review is overdue; every action timestamped; dashboards show exactly what needs attention |
| 2 | Lack of transparency by students | Weekly logbooks with feedback, a visible placement approval timeline, and a result released only through the system |
| 3 | High cost of supervisor transport | Academic supervisors follow students, read logbooks, record visits and assessments remotely; physical visits become targeted |
| 4 | Visits interfering with the intern's work | Visits are scheduled in the system and logged; most oversight needs no visit |
| 5 | Cheating: absent students, fake reports, inflated hours | Hours count only after the **workplace supervisor verifies them**; missing weeks are detected automatically; duplicate-text, late-entry and hours-outlier flags; academic supervisor sees everything remotely (see 7.5) |

**Principles**

- **Simple first.** 9 small Django apps, 4 roles, no feature without a problem it solves.
- **Reuse over rewrite.** Authentication, permissions, API docs, filtering, scheduling, audit history and file storage all come from open-source packages.
- **Server is the source of truth.** Status transitions, time and totals are computed on the server.
- **Rules as data.** The assessment rubric is configuration, not code.
- **Secure by default.** Closed registration, object-level authorization on every query, private file storage.
- **12-factor.** One image for all environments; only environment variables change.

---

## 2. Expected Outcomes and Features

### 2.1 Your three expected outcomes mapped to features

| Expected outcome | Delivered by |
|---|---|
| **1. Placement management:** submit host organisation details and track approval from the coordinator | F2 |
| **2. Record weekly activities and hours, then receive feedback from supervisors** | F3, F4 |
| **3. Assessments and reports:** supervisors submit evaluations; the coordinator views results in one summary | F6, F8 |

### 2.2 Feature list (MVP)

| # | Feature | What it does | Users |
|---|---|---|---|
| F1 | **Accounts and roles** | Login, password reset, role-based access. No public sign-up: coordinator creates users or imports a CSV. | All |
| F2 | **Placement request and approval** | Student submits host organisation and placement details (draft, submit, resubmit). Coordinator approves, returns with remarks or rejects, and assigns one academic and one workplace supervisor (inviting the workplace supervisor from the submitted email if no account exists). Student sees a status timeline. | Student, Coordinator |
| F3 | **Weekly logbook** | One logbook entry per week, containing daily lines (date, hours, description) and optional images. Draft, submit, edit if returned. | Student |
| F4 | **Logbook review and feedback** | Workplace supervisor approves (optionally adjusting hours per day) or returns with a comment. Academic supervisor also comments. Overdue reviews trigger reminders then escalation. | Supervisors |
| F5 | **Visits** | Academic supervisor schedules and records phone, video or on-site visits; progress against the minimum visits per placement. | Academic supervisor |
| F6 | **Assessments and final report** | Both supervisors complete evaluation forms built from the institution's official rubric. Student uploads a final report; academic supervisor accepts or returns it. Coordinator finalizes and releases the result. | Supervisors, Student, Coordinator |
| F7 | **Notices** | Coordinator posts notices to chosen audiences, optionally emailed. | Coordinator (post), all (read) |
| F8 | **Dashboards and summary reports** | A dashboard per role; per-placement summary; one period summary for the coordinator with CSV export. | All |
| X | **Cross-cutting** | Email notifications, audit history, integrity flags, health checks. | System |

### 2.3 Out of scope for MVP

Geofencing and location tracking (deferred, section 19), in-app notification bell, chat, payroll, other evidence uploads (only logbook images and the final report), offline mode, native mobile apps, integration with the student information system.

---

## 3. Actors and Permission Matrix

| Role | Code | UI label | Description |
|---|---|---|---|
| Student | `STUDENT` | Student | Intern or attachee |
| Workplace Supervisor | `WORKPLACE_SUPERVISOR` | Industrial Supervisor | Employee of the host organisation; **one per placement** |
| Academic Supervisor | `ACADEMIC_SUPERVISOR` | Academic Supervisor | Institution staff overseeing students remotely |
| Coordinator | `COORDINATOR` | Coordinator | Administrator of the whole programme |

`C` create, `R` read, `U` update, `A` approve/decide, `-` none. "Own" = the student's own placement; "Assigned" = placements where the user is the assigned supervisor.

| Resource | Student | Workplace Sup. | Academic Sup. | Coordinator |
|---|---|---|---|---|
| Users | R own | R own | R own | CRUD, import |
| Organizations | C, R (verified + own) | R own organisation | R | CRUD, verify |
| Placements | C/U/R own (draft or returned), submit | R assigned | R assigned | R all, A (approve, return, reject), assign supervisors |
| Logbook weeks | C/U/R own (until submitted) | R, A assigned | R assigned, comment | R all, reopen |
| Logbook images | C/R own | R assigned | R assigned | R all |
| Integrity flags | - | R assigned | R assigned, resolve | R all, resolve |
| Visits | R own | R assigned | C/U/R assigned | R all |
| Assessment forms (rubric) | R | R | R | CRUD |
| Assessments | R own (after release) | C/U/R own submitted by me | C/U/R own submitted by me | R all |
| Final report | C/R own | R assigned | R, A assigned | R all |
| Placement result | R own (after release) | - | R assigned (preview) | R, finalize |
| Notices | R (audience) | R (audience) | R (audience) | CRUD |
| Dashboards | own | own | own | own |
| Reports and export | own summary | assigned | assigned | all, export |

---

## 4. System Architecture

```mermaid
flowchart LR
    U[Browser<br/>React web app] -->|HTTPS| N[Nginx<br/>reverse proxy, TLS]
    N -->|/api, /auth, /admin| D[Django + DRF<br/>Gunicorn]
    N -->|/ built static or Vite dev| F[(Frontend)]
    D --> P[(PostgreSQL)]
    D --> R[(Redis<br/>cache, throttling, results)]
    D -->|publish tasks| Q{{RabbitMQ}}
    D <-->|upload, signed URL| S[(File storage<br/>local folder in dev,<br/>S3 / GCS / Azure in prod)]
    Q --> W[Celery workers]
    B[Celery Beat] --> Q
    W --> P
    W --> M[SMTP / email provider]
```

Frontend and API are served from the **same origin** through Nginx (`/` and `/api/`). This keeps the refresh-token cookie `SameSite=Strict`, avoids CORS in production, and is simpler for a browser-only client.

### 4.1 Open-source modules (instead of writing from scratch)

| Concern | Module | Notes |
|---|---|---|
| Framework | **Django 5.2 LTS** | ORM, admin, migrations, `STORAGES` setting |
| REST API | **djangorestframework** | Serializers, viewsets, permissions, throttling |
| Authentication | **dj-rest-auth** + **djangorestframework-simplejwt** | Login, logout, password reset and change, JWT with rotating refresh and blacklist. No `allauth`: registration is closed. |
| Brute-force protection | **django-axes** | Lockout after repeated failures |
| Object-level authorization | **django-rules** + DRF permission classes | Predicates such as `is_assigned_workplace_supervisor` reused in permissions and tests |
| API docs | **drf-spectacular** + **drf-spectacular-sidecar** | Auto-generated OpenAPI schema, Swagger UI and ReDoc; sidecar serves UI assets locally (no CDN) |
| Filtering | **django-filter** | Declarative filters |
| Config | **django-environ** | `.env`, `DATABASE_URL` parsing |
| Audit history | **django-simple-history** | History tables; also powers the placement status timeline |
| Async and schedules | **Celery**, **django-celery-beat** (RabbitMQ broker) | Emails, reminders, escalation, exports, imports |
| Cache and throttle | **Redis**, **django-redis** | |
| File storage | **django-storages** (`[s3]`, `[google]`, `[azure]` extras, installed per deployment) | One interface, many cloud providers |
| Image handling | **Pillow** | Validate, resize, strip EXIF |
| File type check | **filetype** | Magic-byte detection for PDF and DOCX uploads |
| DB driver | **psycopg 3** | |
| Server | **gunicorn** | |
| Health | **django-health-check** | `/health/` |
| Logging | **python-json-logger** | JSON to stdout |
| Errors | **sentry-sdk** (optional) | |
| Testing | **pytest**, **pytest-django**, **pytest-cov**, **pytest-xdist**, **factory-boy**, **freezegun**, **moto** | `moto` mocks S3 so storage tests need no cloud account |
| Quality and security | **ruff**, **pre-commit**, **bandit**, **pip-audit** | |
| Dev services | **Mailpit** (email catcher), **MinIO** (optional S3 look-alike) | |

---

## 5. Monorepo Folder Structure

```text
internship-system/
├── .github/
│   ├── workflows/
│   │   ├── backend-ci.yml
│   │   └── backend-cd.yml            # (later) build and push image on tag
│   ├── dependabot.yml
│   └── pull_request_template.md
│
├── backend/                          # Django project (section 5.1)
│
├── frontend/                         # React web app (designed later)
│
├── infra/
│   └── nginx/
│       ├── nginx.dev.conf
│       └── nginx.prod.conf
│
├── postman/
│   ├── siams.postman_collection.json
│   ├── local.postman_environment.json
│   ├── staging.postman_environment.json
│   └── files/                        # sample.jpg, sample-report.pdf for upload tests
│
├── docs/
│   └── internship-system-design.md
│
├── docker-compose.yml                # development stack
├── docker-compose.prod.yml           # production overrides
├── .env.example
├── .gitignore                        # includes backend/media/*
├── .editorconfig
├── .pre-commit-config.yaml
├── Makefile                          # make up, test, migrate, seed
└── README.md
```

### 5.1 Backend folder structure

```text
backend/
├── Dockerfile                        # multi-stage: dev and prod targets
├── manage.py
├── pyproject.toml                    # ruff, pytest, coverage config
├── requirements/
│   ├── base.txt
│   ├── dev.txt                       # -r base.txt + test and debug tools
│   ├── prod.txt                      # -r base.txt + gunicorn, sentry
│   └── storages/                     # install exactly one in production
│       ├── s3.txt                    # django-storages[s3]     (AWS S3, MinIO, R2, Spaces, Wasabi)
│       ├── gcs.txt                   # django-storages[google] (Google Cloud Storage)
│       └── azure.txt                 # django-storages[azure]  (Azure Blob)
├── scripts/
│   ├── entrypoint.sh                 # wait for DB, migrate (dev only), start
│   ├── start-worker.sh
│   └── start-beat.sh
│
├── media/                            # DEV ONLY, git-ignored, grouped by day (section 5.3)
│   └── .gitkeep
│
├── config/
│   ├── __init__.py                   # exposes the Celery app
│   ├── asgi.py
│   ├── wsgi.py
│   ├── celery.py
│   ├── urls.py                       # /api/v1/, /api/docs/, /admin/, /health/
│   └── settings/
│       ├── __init__.py
│       ├── base.py                   # common; every value from env
│       ├── storage.py                # builds STORAGES from STORAGE_BACKEND
│       ├── dev.py
│       ├── prod.py
│       └── test.py
│
├── apps/
│   ├── core/                         # shared building blocks, no business rules
│   │   ├── models.py                 # abstract BaseModel, SoftDeleteModel
│   │   ├── permissions.py            # IsRole and base object permissions
│   │   ├── pagination.py
│   │   ├── exceptions.py             # error envelope, domain exceptions
│   │   ├── events.py                 # custom signals (domain events)
│   │   ├── viewsets.py               # base viewsets that scope querysets
│   │   ├── storage.py                # dated_upload_path(), FileStorageService, serve_file()
│   │   ├── validators.py             # size, extension, magic bytes, image checks
│   │   ├── utils/
│   │   │   ├── timeutils.py          # pure: week_start(), weeks_between()
│   │   │   └── text.py               # pure: normalize_and_hash()
│   │   ├── management/commands/
│   │   │   ├── seed_demo_data.py
│   │   │   ├── load_assessment_form.py   # import an official rubric from JSON
│   │   │   └── close_period.py
│   │   └── tests/
│   │
│   ├── accounts/
│   │   ├── models.py                 # User, StudentProfile, SupervisorProfile
│   │   ├── managers.py
│   │   ├── serializers.py
│   │   ├── views.py                  # UserViewSet, MeView
│   │   ├── urls.py
│   │   ├── permissions.py
│   │   ├── services.py               # UserService: create, invite_workplace_supervisor, bulk_import
│   │   ├── selectors.py
│   │   ├── tasks.py                  # CSV import
│   │   ├── admin.py
│   │   ├── migrations/
│   │   └── tests/
│   │
│   ├── placements/
│   │   ├── models.py                 # InternshipPeriod, GradeBand, Organization, Placement
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── permissions.py
│   │   ├── services.py               # PlacementService: submit, approve, return_, reject, complete
│   │   ├── selectors.py              # placements_visible_to(user)
│   │   ├── filters.py
│   │   ├── admin.py
│   │   ├── migrations/
│   │   └── tests/
│   │       ├── factories.py
│   │       ├── test_state_machine.py
│   │       ├── test_services.py
│   │       └── test_api.py
│   │
│   ├── logbook/
│   │   ├── models.py                 # LogbookEntry (week), DailyActivity, LogbookImage,
│   │   │                             # LogbookFeedback, IntegrityFlag
│   │   ├── serializers.py            # nested writable daily activities
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── permissions.py
│   │   ├── rules.py                  # strategy classes: HoursPerDayRule, DuplicateContentRule...
│   │   ├── services.py               # LogbookService: save_week, submit, approve, return_
│   │   ├── images.py                 # ImageProcessor: validate, resize, strip EXIF
│   │   ├── selectors.py              # weekly timeline incl. missing weeks, pending reviews
│   │   ├── tasks.py                  # remind_pending_reviews, escalate_overdue, flag_missing_weeks
│   │   ├── migrations/
│   │   └── tests/
│   │       ├── factories.py
│   │       ├── test_rules.py         # pure unit tests, no DB
│   │       ├── test_services.py
│   │       ├── test_images.py
│   │       ├── test_tasks.py
│   │       └── test_api.py
│   │
│   ├── visits/
│   │   ├── models.py                 # Visit
│   │   ├── serializers.py  views.py  urls.py  permissions.py
│   │   ├── services.py               # VisitService
│   │   └── tests/
│   │
│   ├── assessments/
│   │   ├── models.py                 # AssessmentForm, Criterion, Assessment, AssessmentScore,
│   │   │                             # FinalReport, PlacementResult
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── permissions.py
│   │   ├── scoring.py                # ScoringStrategy, WeightedPercentStrategy (pure)
│   │   ├── importers.py              # AssessmentFormImporter (JSON, versioned)
│   │   ├── services.py               # AssessmentService, FinalReportService, ResultService
│   │   ├── selectors.py
│   │   ├── migrations/
│   │   └── tests/
│   │       ├── test_scoring.py       # pure unit tests
│   │       ├── test_form_versioning.py
│   │       ├── test_services.py
│   │       └── test_api.py
│   │
│   ├── notices/
│   │   ├── models.py                 # Notice
│   │   ├── serializers.py  views.py  urls.py  permissions.py
│   │   ├── selectors.py              # notices_visible_to(user)
│   │   └── tests/
│   │
│   ├── notifications/                # email now; other channels later; no models
│   │   ├── channels.py               # NotificationChannel, EmailChannel
│   │   ├── services.py               # NotificationService.notify(user, type, context)
│   │   ├── receivers.py              # listens to domain events, enqueues tasks
│   │   ├── tasks.py                  # send_email
│   │   ├── templates/notifications/
│   │   └── tests/
│   │
│   └── reports/                      # read-only: dashboards and summaries, no models
│       ├── dashboards/
│       │   ├── base.py               # DashboardBuilder (abstract)
│       │   ├── student.py            # StudentDashboard
│       │   ├── academic_supervisor.py
│       │   ├── workplace_supervisor.py
│       │   └── coordinator.py
│       ├── selectors.py              # placement summary, period summary (aggregates)
│       ├── serializers.py
│       ├── views.py
│       ├── urls.py
│       ├── tasks.py                  # CSV export
│       └── tests/
│
└── tests/                            # cross-app tests
    ├── conftest.py                   # api_client, one user fixture per role, tmp media dir
    ├── test_permissions_matrix.py    # asserts the table in section 3
    └── test_e2e_placement_lifecycle.py
```

**Layout convention for every app**

| File | Responsibility | Rule |
|---|---|---|
| `models.py` | Data and invariants of an entity | Small behaviors that belong to the entity (`placement.can_log_on(date)`) |
| `serializers.py` | Input validation and output shape | No business decisions |
| `views.py` | HTTP only | Thin: call a service or selector and return |
| `services.py` | **Writes**: business use cases in `transaction.atomic` | One home for every business rule |
| `selectors.py` | **Reads**: reusable, role-scoped queries | Always used to scope access |
| `rules.py` / `scoring.py` | Pluggable strategies | Pure where possible |
| `permissions.py` | Who may do what | `django-rules` predicates |
| `tasks.py` | Celery entry points | Thin, idempotent, call services |
| `receivers.py` | Reactions to domain events | Only in `notifications` |

### 5.2 Frontend folder

```text
frontend/        # React web app. Internal structure intentionally omitted; designed later.
```

### 5.3 Media storage layout and strategy

**Development** (`STORAGE_BACKEND=filesystem`): files are saved inside the backend project, grouped **by day** rather than dumped into one folder.

```text
backend/media/                              # git-ignored
├── 2026/
│   └── 11/
│       ├── 08/
│       │   ├── logbook/
│       │   │   ├── 3f9c1e2a7b8d4c6e9a10b2c3d4e5f607.jpg
│       │   │   └── a1b2c3d4e5f60718293a4b5c6d7e8f90.webp
│       │   └── final_reports/
│       │       └── 5d6e7f8091a2b3c4d5e6f708192a3b4c.pdf
│       └── 09/
│           └── logbook/
│               └── ...
```

Key pattern: `{YYYY}/{MM}/{DD}/{category}/{uuid4}{ext}`

- Generated by one function, `core.storage.dated_upload_path(category)`, used by every `upload_to`.
- File names are random UUIDs: no student names or original file names leak, and collisions cannot happen. The original name is stored in the database for display.
- **The same key pattern is used in S3, GCS and Azure**, so development and production behave identically (12-factor parity).

**Production** (`STORAGE_BACKEND` chosen by env var; settings build `STORAGES["default"]` through a small factory in `config/settings/storage.py`):

| `STORAGE_BACKEND` | Django storage class | Use for | Extra requirements file |
|---|---|---|---|
| `filesystem` | `FileSystemStorage` at `MEDIA_ROOT` | Development, or a single server with a persistent volume | none |
| `s3` | `storages.backends.s3.S3Storage` | AWS S3 and any S3-compatible service (MinIO, Cloudflare R2, DigitalOcean Spaces, Wasabi) via `AWS_S3_ENDPOINT_URL` | `storages/s3.txt` |
| `gcs` | `storages.backends.gcloud.GoogleCloudStorage` | Google Cloud Storage | `storages/gcs.txt` |
| `azure` | `storages.backends.azure_storage.AzureStorage` | Azure Blob Storage | `storages/azure.txt` |

**Rules for every backend**

- Buckets and folders are **private**. Files are never linked directly.
- Files are delivered through authenticated API endpoints that check permission first, then either stream the file (filesystem) or **redirect to a short-lived signed URL** (cloud, 60 seconds).
- Cloud storage keeps web containers stateless (12-factor VI). A filesystem backend in production is acceptable only for one server with a backed-up volume.

---

## 6. Software Design Approach

### 6.1 Layering

```mermaid
flowchart TD
    A[HTTP request] --> B[Authentication + permission classes]
    B --> C[View / ViewSet<br/>thin, HTTP only]
    C --> D[Serializer<br/>input validation]
    D --> E[Service<br/>use case in a transaction]
    E --> F[Rules / Strategies<br/>pluggable checks]
    E --> G[Models / ORM]
    E --> FS[FileStorageService<br/>django-storages]
    C --> H[Selector<br/>role-scoped reads]
    H --> G
    E -.domain event.-> I[Signal receivers]
    I -.on_commit.-> J[Celery task]
    J --> K[Notification channels<br/>email]
```

### 6.2 OOP principles applied

| Principle | Where it shows up |
|---|---|
| **Encapsulation** | Status changes only through model or service methods (`placement.approve()`, `entry.submit()`) that enforce a transition map. No code sets `status` directly. |
| **Abstraction and inheritance** | `BaseModel` (UUID id, timestamps), `SoftDeleteModel`, `DashboardBuilder` base class, base viewsets that scope querysets. |
| **Polymorphism** | Logbook rules, scoring strategies, notification channels and dashboard builders share interfaces; callers do not know which concrete class runs. |
| **Single Responsibility** | Views handle HTTP, serializers validate, services decide, selectors read, tasks schedule. |
| **Open/Closed** | New integrity check = new `LogbookRule` class. New grading method = new `ScoringStrategy`. New storage = new env value. No edits to existing services. |
| **Liskov Substitution** | Every rule returns the same `RuleResult`; every dashboard builder returns the same envelope. |
| **Interface Segregation** | Small interfaces: `LogbookRule.evaluate()`, `ScoringStrategy.percent()`, `NotificationChannel.send()`. |
| **Dependency Inversion** | Services receive collaborators (rules, clock, storage, channels) by constructor, so tests inject fakes and a frozen clock. |

### 6.3 Patterns used (only where they pay off)

| Pattern | Use |
|---|---|
| Service layer | One class per module for write use cases |
| Selector (query object) | `placements_visible_to(user)` returns exactly what each role may see; fixes access bugs in one place |
| Strategy / rule chain | `LogbookRule` list; `ScoringStrategy` |
| State (transition map) | Allowed transitions per model (section 10) |
| Observer (domain events) | Services emit signals; `notifications.receivers` reacts |
| Factory | `StorageBackendFactory` (env to storage class); `DashboardFactory` (role to builder); `NotificationService` (type to channels) |
| Template method | `DashboardBuilder.build()` calls role-specific `widgets()`; shared envelope and caching |

### 6.4 Functional and procedural parts

| Style | Where |
|---|---|
| **Pure functions** (no DB, trivial to unit-test) | `week_start()`, `weeks_between()`, `normalize_and_hash()`, `WeightedPercentStrategy.percent()`, each `LogbookRule`, file validators |
| **Procedural** | Celery tasks, management commands (`seed_demo_data`, `load_assessment_form`, `close_period`), entrypoint scripts |
| **Event-driven** | Domain signal, then `transaction.on_commit`, then idempotent Celery task with retry and backoff |

### 6.5 Domain events

| Event | Emitted by | Reaction (email unless stated) |
|---|---|---|
| `placement_submitted` | PlacementService | Coordinators: new placement awaiting approval |
| `placement_approved` / `placement_returned` / `placement_rejected` | PlacementService | Student (with remarks); on approval also both supervisors |
| `workplace_supervisor_invited` | UserService | Set-password email to the new workplace supervisor |
| `logbook_submitted` | LogbookService | Workplace supervisor |
| `logbook_approved` / `logbook_returned` | LogbookService | Student |
| `feedback_added` | LogbookService | Student |
| `review_overdue` | Beat task | Reminder to workplace supervisor, then escalation to academic supervisor |
| `week_missing` | Beat task | Student reminder; flag visible to academic supervisor and coordinator |
| `visit_scheduled` | VisitService | Student and workplace supervisor |
| `final_report_submitted` | FinalReportService | Academic supervisor |
| `final_report_accepted` / `_returned` | FinalReportService | Student |
| `result_finalized` | ResultService | Student |
| `notice_posted` | NoticeService | Audience, only when `send_email` is true |

---

## 7. Domain Model

### 7.1 Class diagram

```mermaid
classDiagram
    class BaseModel {
        <<abstract>>
        +UUID id
        +datetime created_at
        +datetime updated_at
    }
    class User {
        +string email
        +string full_name
        +string phone
        +Role role
        +bool is_active
    }
    class StudentProfile {
        +string registration_number
        +string programme
        +int year_of_study
    }
    class SupervisorProfile {
        +string job_title
        +string department
    }
    class InternshipPeriod {
        +string name
        +Type type
        +date start_date
        +date end_date
        +int required_hours
        +int min_visits
        +date assessment_opens_on
    }
    class GradeBand {
        +decimal min_percent
        +string label
    }
    class Organization {
        +string name
        +string address
        +string county
        +string contact_email
        +string contact_phone
        +bool is_verified
    }
    class Placement {
        +Status status
        +string role_title
        +string department
        +text task_description
        +date start_date
        +date end_date
        +string proposed_supervisor_name
        +string proposed_supervisor_email
        +string proposed_supervisor_phone
        +text coordinator_remarks
        +submit()
        +approve(by, academic, workplace)
        +return_for_changes(by, remarks)
        +reject(by, remarks)
        +complete()
        +can_log_on(date) bool
    }
    class LogbookEntry {
        +int week_number
        +date week_start
        +text summary
        +Status status
        +datetime submitted_at
        +claimed_hours() decimal
        +approved_hours() decimal
        +submit()
        +approve(reviewer, adjustments)
        +return_for_edit(reviewer, comment)
    }
    class DailyActivity {
        +date work_date
        +decimal hours
        +decimal approved_hours
        +text description
    }
    class LogbookImage {
        +file image
        +string caption
        +string original_name
    }
    class LogbookFeedback {
        +Kind kind
        +text comment
    }
    class IntegrityFlag {
        +FlagType type
        +string detail
        +bool resolved
        +resolve(user, note)
    }
    class Visit {
        +Mode mode
        +datetime scheduled_at
        +Status status
        +text notes
    }
    class AssessmentForm {
        +string name
        +Role assessor_role
        +int version
        +decimal weight_percent
        +bool is_active
        +bool is_locked
    }
    class Criterion {
        +string code
        +string section
        +string name
        +Type type
        +int max_score
        +decimal weight
        +bool required
        +int position
    }
    class Assessment {
        +Status status
        +text comment
        +decimal percent
        +datetime submitted_at
    }
    class AssessmentScore {
        +int score
        +text remark
    }
    class FinalReport {
        +file document
        +string original_name
        +Status status
        +text feedback
    }
    class PlacementResult {
        +decimal total_percent
        +string grade
        +datetime finalized_at
    }
    class Notice {
        +string title
        +text body
        +Audience audience
        +bool pinned
        +datetime publish_at
        +datetime expires_at
        +bool send_email
    }

    BaseModel <|-- User
    BaseModel <|-- InternshipPeriod
    BaseModel <|-- Organization
    BaseModel <|-- Placement
    BaseModel <|-- LogbookEntry
    BaseModel <|-- DailyActivity
    BaseModel <|-- LogbookImage
    BaseModel <|-- LogbookFeedback
    BaseModel <|-- IntegrityFlag
    BaseModel <|-- Visit
    BaseModel <|-- AssessmentForm
    BaseModel <|-- Assessment
    BaseModel <|-- FinalReport
    BaseModel <|-- PlacementResult
    BaseModel <|-- Notice

    User "1" -- "0..1" StudentProfile
    User "1" -- "0..1" SupervisorProfile
    Organization "1" -- "*" SupervisorProfile : employs
    InternshipPeriod "1" -- "*" GradeBand
    InternshipPeriod "1" -- "*" Placement
    Organization "1" -- "*" Placement : hosts
    User "1" -- "*" Placement : student
    User "0..1" -- "*" Placement : workplace supervisor
    User "0..1" -- "*" Placement : academic supervisor
    Placement "1" -- "*" LogbookEntry
    LogbookEntry "1" -- "1..*" DailyActivity
    LogbookEntry "1" -- "*" LogbookImage
    LogbookEntry "1" -- "*" LogbookFeedback
    Placement "1" -- "*" IntegrityFlag
    LogbookEntry "0..1" -- "*" IntegrityFlag
    Placement "1" -- "*" Visit
    InternshipPeriod "1" -- "*" AssessmentForm
    AssessmentForm "1" -- "1..*" Criterion
    Placement "1" -- "*" Assessment
    AssessmentForm "1" -- "*" Assessment
    Assessment "1" -- "*" AssessmentScore
    Criterion "1" -- "*" AssessmentScore
    Placement "1" -- "0..1" FinalReport
    Placement "1" -- "0..1" PlacementResult
    InternshipPeriod "0..1" -- "*" Notice
```

### 7.2 Services, rules and strategies

```mermaid
classDiagram
    class LogbookService {
        -rules: list~LogbookRule~
        -clock: Clock
        +save_week(placement, data) LogbookEntry
        +submit(entry)
        +approve(entry, reviewer, adjustments)
        +return_for_edit(entry, reviewer, comment)
        +add_image(entry, file, caption) LogbookImage
    }
    class LogbookRule {
        <<interface>>
        +evaluate(context) RuleResult
    }
    class DateWithinPlacementRule
    class NoFutureDateRule
    class HoursPerDayRule
    class WeeklyTotalRule
    class MinimumDescriptionRule
    class DuplicateContentRule
    class LateSubmissionRule
    class RuleResult {
        +Outcome outcome
        +FlagType flag
        +string reason
    }
    class ScoringStrategy {
        <<interface>>
        +percent(assessment) decimal
    }
    class WeightedPercentStrategy
    class ResultService {
        -strategy: ScoringStrategy
        +preview(placement) ResultPreview
        +finalize(placement, by) PlacementResult
    }
    class AssessmentFormImporter {
        +import_json(data) AssessmentForm
        +new_version(form) AssessmentForm
    }
    class FileStorageService {
        +save_image(file, category) StoredFile
        +save_document(file, category) StoredFile
        +open_or_url(stored, user) FileResponse
    }
    class StorageBackendFactory {
        +build(env) dict
    }
    class NotificationService {
        +notify(user, type, context)
    }
    class NotificationChannel {
        <<interface>>
        +send(message)
    }
    class EmailChannel

    LogbookRule <|.. DateWithinPlacementRule
    LogbookRule <|.. NoFutureDateRule
    LogbookRule <|.. HoursPerDayRule
    LogbookRule <|.. WeeklyTotalRule
    LogbookRule <|.. MinimumDescriptionRule
    LogbookRule <|.. DuplicateContentRule
    LogbookRule <|.. LateSubmissionRule
    LogbookService o-- LogbookRule
    LogbookService --> FileStorageService
    LogbookRule --> RuleResult
    ScoringStrategy <|.. WeightedPercentStrategy
    ResultService o-- ScoringStrategy
    FileStorageService --> StorageBackendFactory
    NotificationChannel <|.. EmailChannel
    NotificationService o-- NotificationChannel
```

### 7.3 Database design rules (ORM as code)

| Rule | Application |
|---|---|
| Normalized (3NF) | Organizations are separate from placements; supervisors are `User` rows referenced by FK, never copied as text (the `proposed_supervisor_*` columns are only the student's suggestion until approval). |
| UUID primary keys | On all user-facing entities; prevents ID guessing. |
| Explicit `on_delete` | `PROTECT` for history (placements, logbook, assessments); `CASCADE` only for pure children (`DailyActivity`, `AssessmentScore`, `LogbookImage`). |
| Soft delete | Users, organizations, placements. Academic records are never destroyed. |
| Unique constraints | `LogbookEntry(placement, week_start)`; `DailyActivity(entry, work_date)`; `AssessmentScore(assessment, criterion)`; `Assessment(placement, form)`; `Criterion(form, code)`; `AssessmentForm(period, assessor_role, version)`; `FinalReport(placement)`; `IntegrityFlag(placement, type, entry)` (idempotent flagging); **partial unique** `Placement(student, period)` excluding `REJECTED` and `TERMINATED`. |
| Check constraints | `end_date >= start_date`; `hours > 0 AND hours <= 12`; `approved_hours <= hours`; `max_score > 0`; `weight >= 0`; `weight_percent BETWEEN 0 AND 100`; once `status = APPROVED` both supervisors are not null. |
| Cross-row rules in services | Sum of active form weights for a period equals 100; score at most `criterion.max_score`; week starts on Monday. |
| Indexes | `(placement, week_start)` (unique), `LogbookEntry(status, submitted_at)` for review queues, `Placement(status)`, `Placement(workplace_supervisor)`, `Placement(academic_supervisor)`, `IntegrityFlag(resolved, type)`, `Notice(publish_at, expires_at)`. |
| Types | `Decimal(4,2)` hours; `Decimal(5,2)` scores and percentages; all datetimes UTC (`USE_TZ=True`), shown in `Africa/Nairobi`. |
| Enums | `TextChoices`, stored as short strings. |
| Files | `FileField`/`ImageField` store only the **key** (`max_length=255`); original name and size kept in separate columns; deleting a row never silently deletes history without a cleanup task. |
| Audit | `django-simple-history` on `Placement`, `LogbookEntry`, `DailyActivity`, `Assessment`, `FinalReport`, `PlacementResult`. |
| Migrations | Committed and reviewed; CI fails on `makemigrations --check` drift; no business logic in migrations. |
| Transactions | Every service write is `transaction.atomic`; events fire with `transaction.on_commit`. |
| DB privileges | App user cannot create or drop databases; migrations run as a release step in production. |

### 7.4 Core business rules (all values configurable)

| Area | Rule |
|---|---|
| Placement | Dates must lie inside the period. Student edits only in `DRAFT` or `RETURNED`. Approval requires both an academic and a workplace supervisor. One active placement per student per period. |
| Logbook access | Entries only for `APPROVED` placements and dates inside the placement. Week = Monday to Sunday. No future dates. |
| Daily line | Hours greater than 0 and at most 12. Description at least 30 characters (stops "worked" as an activity). |
| Weekly submit | At least one daily line. Allowed from the week's last working day. Submission later than 7 days after the week ends is flagged `LATE_SUBMISSION`. |
| Hours that count | Only **approved hours**. By default `approved_hours = hours`; the workplace supervisor may reduce a day with a mandatory comment. Progress toward `required_hours` uses approved hours only. |
| Review SLA | Reminder after 48 h, escalation to the academic supervisor after 72 h. |
| Approved weeks | Locked. Only the coordinator can reopen one, with a reason (it returns to `RETURNED`). |
| Images | Up to 5 per weekly entry; JPEG, PNG or WebP; at most 5 MB each; re-encoded, longest side 1600 px, EXIF removed; add or delete only while the entry is editable. |
| Final report | PDF, DOC or DOCX, at most 10 MB. Upload and replace allowed while `SUBMITTED` or `RETURNED`; locked once `ACCEPTED`. |
| Visits | At least `period.min_visits` completed visits per placement (tracked, shown on dashboards). |
| Assessments | Open from `period.assessment_opens_on`. One per placement per form. Locked after submission. |
| Finalization | Needs a submitted assessment for every active form of the period, and (configurable) an accepted final report. |
| Notices | Visible when `publish_at <= now < expires_at` and the viewer matches the audience. |

### 7.5 Integrity controls without geofencing

Geofencing is deferred, so cheating is addressed by other controls, each cheap to run:

| Control | Catches |
|---|---|
| Workplace supervisor verifies hours per day; only approved hours count | Inflated hours, fake attendance |
| Weekly cadence with automatic `MISSING_WEEK` flag | Students who disappear and surface at the end with a report |
| `HOURS_OUTLIER` flag (a day above 10 h, a week above 60 h) | Careless or inflated claims |
| `DUPLICATE_CONTENT` flag (normalized-text hash repeated in the student's own entries or by peers in the same period; visible to coordinator and academic supervisor only) | Copy-paste and shared reports |
| `LATE_SUBMISSION` flag | Reports written long after the fact |
| `HOURS_ADJUSTED` flag (informational) | Pattern of supervisors correcting a student's claims |
| `OFF_DAY_WORK` flag (weekend lines) | Unusual patterns worth a glance |
| Academic supervisor remote view plus scheduled visits | Independent check on the workplace side |
| History tables | Nobody can silently change an approved record |
| Optional images in the logbook | Soft evidence for supervisors |

Flags never block a student; they inform supervisors and the coordinator, who can **resolve** them with a note.

---

## 8. Assessment Rubric as Data (institution's official form)

The criteria in the official form are **configuration stored in the database**, not code, so the institution can change them without a deployment.

```text
InternshipPeriod
 └── AssessmentForm   (assessor_role, version, weight_percent, is_active, is_locked)
      └── Criterion   (code, section, name, type SCORE|COMMENT, max_score, weight, required, position)
```

**How it works**

1. The coordinator imports the official form as JSON (`POST /assessment-forms/import/` or `manage.py load_assessment_form form.json`), or builds it through the API or Django admin.
2. A period normally has two forms: one for `WORKPLACE_SUPERVISOR` and one for `ACADEMIC_SUPERVISOR`. Their `weight_percent` values sum to 100 (for example 60 and 40, as the institution decides).
3. A criterion of type `SCORE` has `max_score` and `weight`. A criterion of type `COMMENT` collects text only (common on paper forms).
4. The final-report quality is simply a criterion on the academic supervisor's form, so no special-case code is needed.
5. **Versioning:** once any assessment is submitted against a form, the form is **locked**. To change it, `POST /assessment-forms/{id}/new-version/` creates version N+1, and old results stay reproducible.
6. **Scoring** is a `ScoringStrategy` (default `WeightedPercentStrategy`):
   - form percent = `Σ (score ÷ max_score × weight) ÷ Σ weight × 100`
   - placement total = `Σ (form percent × form weight_percent) ÷ 100`
   - grade label = `GradeBand` row with the highest `min_percent` not above the total
   - If the institution's grading differs, add a new strategy class and select it by setting; no other code changes.

**Import format** (data, shown for illustration; the actual criteria come from your official form):

```json
{
  "name": "Industrial Supervisor Evaluation",
  "assessor_role": "WORKPLACE_SUPERVISOR",
  "weight_percent": 60,
  "criteria": [
    { "code": "C01", "section": "Professional conduct", "name": "Punctuality and attendance",
      "type": "SCORE", "max_score": 10, "weight": 1, "required": true },
    { "code": "C02", "section": "Professional conduct", "name": "Initiative",
      "type": "SCORE", "max_score": 10, "weight": 1, "required": true },
    { "code": "C99", "section": "General", "name": "Supervisor's overall comment",
      "type": "COMMENT", "required": false }
  ]
}
```

---

## 9. Dashboards (one per role)

Each dashboard is a single read-only endpoint built by a role-specific `DashboardBuilder`. Queries are aggregated in the database (no per-row loops), tested with query-count assertions, and cached for 30 to 60 seconds in Redis. Every dashboard also returns an **`action_items`** list (what needs the user's attention now) and visible **`notices`**, which replaces an in-app notification centre.

### 9.1 Student: "Submit placement details, fill in weekly logbooks and upload your final report"

| Widget | Content |
|---|---|
| Placement tracker | Status (Draft, Submitted, Returned, Approved, Rejected), coordinator remarks, status timeline, assigned supervisors once approved |
| Progress | Approved hours versus required hours; weeks approved, submitted, returned, missing, total |
| Logbook | Current week card with a "continue" action; list of weeks with status; returned weeks highlighted |
| Recent feedback | Latest supervisor comments |
| Upcoming visits | Next scheduled visits |
| Final report | Status (not uploaded, submitted, returned with feedback, accepted) |
| Result | Appears after the coordinator finalizes |
| Notices | Active notices for students |
| Action items | "Complete your placement details", "Fix returned week 3", "Submit week 5", "Upload final report" |

### 9.2 Academic Supervisor: "Follow your students, schedule visits, review logbooks and record assessments"

| Widget | Content |
|---|---|
| My students | Table: student, organisation, hours progress, last submission, flags, status indicator (on track, behind, flagged) |
| Logbook monitor | Weeks recently submitted or approved; weeks missing |
| Visits | Upcoming; visits due versus `min_visits` per student |
| Assessments | Placements where my form is due or in draft |
| Final reports | Submitted reports awaiting my decision |
| Flags | Unresolved integrity flags for my students |
| Notices | Active notices |
| Action items | "Schedule visit for J. Otieno (0 of 2 done)", "Review final report", "Assessment due for 3 students" |

### 9.3 Industrial (Workplace) Supervisor: "Approve weekly entries and evaluate the interns working with your organisation"

| Widget | Content |
|---|---|
| My interns | Interns assigned to me with approved-hours progress |
| **Weekly entries awaiting approval** | Main widget: oldest first, overdue marked, opens the review screen with per-day hours adjustment |
| Evaluations | Interns I have not yet evaluated, evaluation window dates |
| Recently approved | Short history |
| Notices | Active notices |
| Action items | "3 weekly entries waiting (1 overdue)", "Evaluate 2 interns" |

### 9.4 Coordinator: "Approve placements, assign supervisors, post notices and monitor overall progress"

| Widget | Content |
|---|---|
| Placement pipeline | Counts by status for the selected period; list of **submitted placements awaiting approval** |
| Supervisor assignment | Approved or pending placements missing a supervisor; supervisor workload (students per academic supervisor) |
| Overall progress | Cohort hours progress, logbook compliance (weeks submitted versus expected), visits done versus required |
| Flags | Unresolved flags by type and student |
| Assessments and reports | Forms submitted versus expected; final reports submitted, accepted, outstanding |
| Results | Placements ready to finalize; finalized count |
| Notices | Recent notices with quick "post notice" action |
| Action items | "5 placements awaiting approval", "2 approved placements need a supervisor", "4 placements ready to finalize" |

---

## 10. State Diagrams

### 10.1 Placement

```mermaid
stateDiagram-v2
    [*] --> DRAFT: student creates
    DRAFT --> SUBMITTED: student submits
    SUBMITTED --> APPROVED: coordinator approves and assigns supervisors
    SUBMITTED --> RETURNED: coordinator returns with remarks
    SUBMITTED --> REJECTED: coordinator rejects
    RETURNED --> SUBMITTED: student corrects and resubmits
    APPROVED --> COMPLETED: coordinator completes
    APPROVED --> TERMINATED: coordinator terminates
    REJECTED --> [*]
    COMPLETED --> [*]
    TERMINATED --> [*]
```

### 10.2 Weekly logbook entry

```mermaid
stateDiagram-v2
    [*] --> DRAFT: student creates the week
    DRAFT --> SUBMITTED: student submits
    SUBMITTED --> APPROVED: workplace supervisor approves
    SUBMITTED --> RETURNED: workplace supervisor returns with comment
    RETURNED --> SUBMITTED: student edits and resubmits
    APPROVED --> RETURNED: coordinator reopens with reason
    APPROVED --> [*]: locked, hours count
```

### 10.3 Final report

```mermaid
stateDiagram-v2
    [*] --> SUBMITTED: student uploads
    SUBMITTED --> SUBMITTED: student replaces file
    SUBMITTED --> ACCEPTED: academic supervisor accepts
    SUBMITTED --> RETURNED: academic supervisor returns with feedback
    RETURNED --> SUBMITTED: student uploads corrected version
    ACCEPTED --> [*]: locked
```

### 10.4 Assessment

```mermaid
stateDiagram-v2
    [*] --> DRAFT: assessor saves scores
    DRAFT --> DRAFT: edit scores
    DRAFT --> SUBMITTED: assessor submits
    SUBMITTED --> [*]: locked, form becomes locked too
```

---

## 11. Critical Flows

### 11.1 Placement request, approval and supervisor assignment

```mermaid
sequenceDiagram
    autonumber
    actor S as Student
    participant API as Django API
    participant PS as PlacementService
    participant US as UserService
    participant DB as PostgreSQL
    participant MQ as RabbitMQ
    participant W as Celery worker
    actor C as Coordinator
    actor WS as Workplace Supervisor

    S->>API: POST /organizations/ (new host, unverified) or pick a verified one
    S->>API: POST /placements/ (organisation, dates, role, proposed supervisor)
    API->>PS: create_draft()
    PS->>DB: Placement DRAFT
    S->>API: POST /placements/{id}/submit/
    API->>PS: submit()
    PS->>PS: validate completeness, dates inside period
    PS->>DB: status = SUBMITTED (history row)
    PS-->>MQ: on_commit: placement_submitted
    MQ->>W: deliver
    W->>C: email "placement awaiting approval"
    C->>API: GET /dashboard/coordinator/ then GET /placements/{id}/
    alt approve
        C->>API: POST /placements/{id}/approve/ {academic_supervisor, workplace_supervisor or invite=true}
        API->>PS: approve()
        opt invite = true and no account
            PS->>US: invite_workplace_supervisor(proposed details, organization)
            US->>DB: User(role=WS) + SupervisorProfile
            US-->>MQ: set-password email
        end
        PS->>DB: BEGIN; supervisors set; status = APPROVED; organization verified; COMMIT
        PS-->>MQ: on_commit: placement_approved
        W->>S: email "approved"
        W->>WS: email "you supervise this intern"
    else return for changes
        C->>API: POST /placements/{id}/return/ {remarks}
        PS->>DB: status = RETURNED
        W->>S: email with remarks
        S->>API: PATCH then POST /submit/ again
    else reject
        C->>API: POST /placements/{id}/reject/ {remarks}
        PS->>DB: status = REJECTED
        W->>S: email
    end
    S->>API: GET /placements/{id}/timeline/ (track approval)
```

### 11.2 Weekly logbook: write, submit, review, escalate

```mermaid
sequenceDiagram
    autonumber
    actor S as Student
    participant API as Django API
    participant LS as LogbookService
    participant R as Rule chain
    participant DB as PostgreSQL
    participant MQ as RabbitMQ
    participant W as Celery worker
    participant B as Celery Beat
    actor WS as Workplace Supervisor
    actor AS as Academic Supervisor

    S->>API: POST /placements/{id}/logbook/ {week_start, summary, activities[{date, hours, description}]}
    API->>LS: save_week()
    LS->>DB: placement APPROVED? dates inside placement?
    LS->>R: evaluate each daily line
    R-->>LS: REJECT (future date, hours over 12) or PASS / FLAG
    alt rejected
        LS-->>S: 422 with reasons
    else saved
        LS->>DB: LogbookEntry DRAFT + DailyActivity rows
        LS->>DB: IntegrityFlags (hours outlier, duplicate content...)
        API-->>S: 201
    end
    S->>API: POST /logbook/{id}/images/ (optional, see 11.3)
    S->>API: POST /logbook/{id}/submit/
    API->>LS: submit()
    LS->>DB: status = SUBMITTED; LATE_SUBMISSION flag if late
    LS-->>MQ: on_commit: logbook_submitted
    W->>WS: email "weekly entry awaiting approval"
    alt reviewed in time
        WS->>API: POST /logbook/{id}/approve/ {adjustments[], comment}
        LS->>DB: approved_hours set per day; status = APPROVED; feedback saved
        LS-->>MQ: logbook_approved
        W->>S: email
    else returned
        WS->>API: POST /logbook/{id}/return/ {comment}
        LS->>DB: status = RETURNED
        W->>S: email with comment
    else no review for 48 h
        B->>W: remind_pending_reviews (hourly)
        W->>WS: reminder
        B->>W: escalate_overdue (hourly)
        W->>AS: escalation after 72 h
    end
    AS->>API: POST /logbook/{id}/feedback/ (comment at any time)
```

### 11.3 Image upload and protected download

```mermaid
sequenceDiagram
    autonumber
    actor S as Student
    participant N as Nginx
    participant V as View
    participant LS as LogbookService
    participant IP as ImageProcessor
    participant FS as FileStorageService
    participant ST as Storage (folder or S3/GCS/Azure)
    participant DB as PostgreSQL
    actor WS as Workplace Supervisor

    S->>N: POST /logbook/{id}/images/ (multipart)
    N->>N: client_max_body_size check
    N->>V: forward
    V->>V: permission: own entry, status DRAFT or RETURNED
    V->>LS: add_image(entry, file, caption)
    LS->>LS: count under 5? size under 5 MB? extension allowed?
    LS->>IP: process(file)
    IP->>IP: magic-byte type check, Pillow verify, pixel limit
    IP->>IP: re-encode, resize to 1600 px, strip EXIF (GPS)
    IP-->>LS: clean bytes
    LS->>FS: save(bytes, category="logbook")
    FS->>ST: put YYYY/MM/DD/logbook/uuid.jpg
    LS->>DB: LogbookImage row (key, original name, caption)
    V-->>S: 201 {id, caption} (no direct file URL)

    WS->>V: GET /logbook/images/{id}/file/
    V->>V: permission: assigned supervisor of this placement
    alt filesystem backend
        V-->>WS: 200 stream file (nosniff)
    else cloud backend
        V->>FS: signed_url(key, expires=60s)
        V-->>WS: 302 redirect to signed URL
    end
```

### 11.4 Assessment and result finalization

```mermaid
sequenceDiagram
    autonumber
    actor A as Assessor (WS or AS)
    participant API as Django API
    participant AS as AssessmentService
    participant RS as ResultService
    participant SS as ScoringStrategy
    participant DB as PostgreSQL
    participant MQ as RabbitMQ
    participant W as Celery worker
    actor C as Coordinator
    actor S as Student

    A->>API: GET /periods/{id}/assessment-forms/ (my role's active form + criteria)
    A->>API: POST /placements/{id}/assessments/ {form, scores[{criterion, score, remark}], comment}
    API->>AS: save_draft()
    AS->>DB: criteria belong to this form? score at most max? window open?
    AS->>DB: Assessment DRAFT + AssessmentScore rows
    A->>API: POST /assessments/{id}/submit/
    AS->>DB: all required criteria scored? then status = SUBMITTED, form locked
    AS->>SS: percent(assessment)
    SS-->>AS: form percent
    AS->>DB: store percent
    C->>API: GET /placements/{id}/result/ (preview)
    API->>RS: preview()
    RS->>DB: all active forms submitted? final report accepted?
    RS->>SS: combine form percents by weight_percent
    RS-->>C: total, grade, missing items
    C->>API: POST /placements/{id}/finalize/
    RS->>DB: PlacementResult snapshot (total, grade, form versions)
    RS-->>MQ: on_commit: result_finalized
    W->>S: email "your result is available"
    S->>API: GET /placements/{id}/result/ (now visible)
```

### 11.5 Weekly compliance and review SLA jobs

```mermaid
sequenceDiagram
    autonumber
    participant B as Celery Beat
    participant MQ as RabbitMQ
    participant W as Celery worker
    participant DB as PostgreSQL
    actor S as Student
    actor AS as Academic Supervisor

    B->>MQ: Monday 08:00 flag_missing_weeks
    MQ->>W: run
    W->>DB: APPROVED placements; weeks that ended with no SUBMITTED entry
    loop each missing week
        W->>DB: insert IntegrityFlag MISSING_WEEK (unique constraint keeps it idempotent)
        W->>S: email reminder
    end
    W->>AS: digest of students with missing weeks

    B->>MQ: hourly remind_pending_reviews and escalate_overdue
    MQ->>W: run
    W->>DB: SUBMITTED entries older than 48 h / 72 h without decision
    W->>DB: record reminder_sent_at / escalated_at (so each is sent once)
```

### 11.6 Authentication

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant API as dj-rest-auth
    participant AX as django-axes
    participant DB as PostgreSQL

    U->>API: POST /auth/login/ {email, password}
    API->>AX: attempts for this user + IP?
    alt locked out
        AX-->>U: 429 Too Many Attempts
    else allowed
        API->>DB: verify credentials
        alt invalid
            API->>AX: record failure
            API-->>U: 401
        else valid
            API-->>U: 200 access token (15 min) + refresh token (HttpOnly, SameSite=Strict cookie)
        end
    end
    U->>API: POST /auth/token/refresh/ (cookie)
    API-->>U: new access token; old refresh token blacklisted
```

---

## 12. API Design

### 12.1 Conventions

| Topic | Decision |
|---|---|
| Base path and versioning | `/api/v1/` |
| Auth | `Authorization: Bearer <access JWT>`; refresh token in HttpOnly cookie |
| Format | JSON (multipart only for the two upload endpoints); `snake_case`; UUID ids; ISO-8601 UTC datetimes |
| Resource style | Plural nouns; state transitions as `POST /{id}/action/` |
| Pagination | `?page=1&page_size=20` (max 100) returning `{count, next, previous, results}` |
| Filtering | `?status=`, `?period=`, `?date_from=`, `?date_to=`, `?search=`, `?ordering=` |
| Errors | One envelope: `{ "code": "hours_exceed_limit", "message": "...", "details": {...} }` |
| Visibility | A record outside your scope returns **404**, not 403 |
| Rate limits | Anonymous 20/min, user 120/min, login 5/min (Redis) |
| Files | Never exposed as direct links; always `GET .../file/` after a permission check |
| Upload limits | Images 5 MB, final report 10 MB, enforced at Nginx, serializer and service |

**Status codes:** `200` OK, `201` created, `204` no content, `400` validation, `401` unauthenticated, `403` not allowed, `404` not found or not visible, `409` conflict or invalid state transition, `413` payload too large, `422` business rule or file validation failure, `429` throttled.

**Roles:** `S` Student, `WS` Workplace (Industrial) Supervisor, `AS` Academic Supervisor, `C` Coordinator.

### 12.2 Auth and account

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| POST | `/auth/login/` | Log in; returns access token and sets refresh cookie | Public |
| POST | `/auth/logout/` | Blacklist the refresh token | Any |
| POST | `/auth/token/refresh/` | New access token (refresh rotates) | Any |
| POST | `/auth/password/reset/` | Request reset email (also used for first-time password set) | Public |
| POST | `/auth/password/reset/confirm/` | Set a new password with the emailed token | Public |
| POST | `/auth/password/change/` | Change own password | Any |
| GET | `/users/me/` | Own profile, role and profile details | Any |
| PATCH | `/users/me/` | Update own name and phone | Any |

### 12.3 Users

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/users/` | List users; filter by `role`, `is_active`, `search` | C |
| POST | `/users/` | Create a user; sends set-password email | C |
| GET | `/users/{id}/` | Retrieve a user | C |
| PUT | `/users/{id}/` | Replace a user | C |
| PATCH | `/users/{id}/` | Partial update, including deactivate | C |
| POST | `/users/import/` | Upload CSV of students or supervisors; returns `task_id` (async) | C |
| GET | `/users/import/{task_id}/` | Import progress and row errors | C |
| GET | `/supervisors/` | Lightweight list for assignment pickers; filter `role` | C |

### 12.4 Periods and grade bands

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/periods/` | List periods | Any |
| POST | `/periods/` | Create a period (dates, required hours, minimum visits, assessment opening date) | C |
| GET | `/periods/{id}/` | Retrieve a period | Any |
| PUT | `/periods/{id}/` | Update a period | C |
| GET | `/periods/{id}/grade-bands/` | List grade bands | Any |
| PUT | `/periods/{id}/grade-bands/` | Replace grade bands (min percent and label) | C |

### 12.5 Organizations

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/organizations/` | Search organisations. Students see verified ones (name and county only) plus their own submissions. | S, C, AS, WS |
| POST | `/organizations/` | Submit host organisation details (unverified until a placement is approved) | S, C |
| GET | `/organizations/{id}/` | Retrieve an organisation | Scoped |
| PATCH | `/organizations/{id}/` | Edit details (student only while unverified and own) | S, C |
| POST | `/organizations/{id}/verify/` | Mark an organisation verified | C |

### 12.6 Placements

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/placements/` | List placements in my scope; filter `period`, `status`, `student`, `organization` | All (scoped) |
| POST | `/placements/` | Create a draft placement (S for self; C on behalf of a student) | S, C |
| GET | `/placements/{id}/` | Retrieve a placement with remarks and progress | All (scoped) |
| PATCH | `/placements/{id}/` | Edit details (S only in `DRAFT` or `RETURNED`) | S, C |
| GET | `/placements/me/` | Student shortcut: own current placement | S |
| POST | `/placements/{id}/submit/` | Submit for approval | S |
| POST | `/placements/{id}/approve/` | Approve and assign `academic_supervisor` and `workplace_supervisor` (existing user id, or `invite_workplace_supervisor: true` to create from the proposed details) | C |
| POST | `/placements/{id}/return/` | Return to the student with required remarks | C |
| POST | `/placements/{id}/reject/` | Reject with required remarks | C |
| POST | `/placements/{id}/assign-supervisors/` | Change supervisors after approval | C |
| POST | `/placements/{id}/complete/` | Mark completed | C |
| POST | `/placements/{id}/terminate/` | Terminate with a reason | C |
| GET | `/placements/{id}/timeline/` | Status history: who decided what and when | S, C, AS, WS (scoped) |

### 12.7 Weekly logbook, feedback, images and flags

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/placements/{id}/logbook/` | List weekly entries; filter `status` | All (scoped) |
| GET | `/placements/{id}/logbook/timeline/` | Every expected week with its status, including `MISSING` weeks | All (scoped) |
| POST | `/placements/{id}/logbook/` | Create a weekly entry with nested `activities[{work_date, hours, description}]` | S |
| GET | `/logbook/{id}/` | Retrieve an entry with days, images, feedback, flags | All (scoped) |
| PATCH | `/logbook/{id}/` | Edit summary and replace the `activities` list (only `DRAFT` or `RETURNED`) | S |
| POST | `/logbook/{id}/submit/` | Submit for review | S |
| POST | `/logbook/{id}/approve/` | Approve; optional `adjustments[{work_date, approved_hours}]` and comment (comment required when adjusting) | WS |
| POST | `/logbook/{id}/return/` | Return with required comment | WS |
| POST | `/logbook/{id}/reopen/` | Reopen an approved week with a reason | C |
| GET | `/logbook/{id}/feedback/` | List feedback thread | All (scoped) |
| POST | `/logbook/{id}/feedback/` | Add a comment | WS, AS |
| GET | `/logbook/pending/` | Entries waiting for my review (oldest first, overdue marked) | WS |
| POST | `/logbook/{id}/images/` | Upload an image (`multipart`: `image`, `caption`, optional `work_date`) | S |
| DELETE | `/logbook/images/{image_id}/` | Remove an image (while editable) | S |
| GET | `/logbook/images/{image_id}/file/` | Download or view an image through a permission check | All (scoped) |
| GET | `/flags/` | List integrity flags; filter `placement`, `type`, `resolved` | C, AS, WS (scoped) |
| POST | `/flags/{id}/resolve/` | Resolve a flag with a note | C, AS |

### 12.8 Visits

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/visits/` | My visits across placements; filter `status`, `date_from`, `date_to` | AS, WS, S (scoped) |
| GET | `/placements/{id}/visits/` | Visits for one placement | All (scoped) |
| POST | `/placements/{id}/visits/` | Schedule a visit (`PHONE`, `VIDEO`, `ONSITE`, optional meeting link) | AS |
| PATCH | `/visits/{id}/` | Reschedule, cancel or edit notes | AS |
| POST | `/visits/{id}/complete/` | Mark completed with findings | AS |

### 12.9 Assessment forms (rubric)

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/periods/{id}/assessment-forms/` | List forms with criteria for a period (supervisors see only their role's form) | Any (scoped) |
| POST | `/periods/{id}/assessment-forms/` | Create a form with nested criteria | C |
| POST | `/assessment-forms/import/` | Import an official form from JSON | C |
| GET | `/assessment-forms/{id}/` | Retrieve a form with criteria | Any (scoped) |
| PUT | `/assessment-forms/{id}/` | Update a form (409 if locked) | C |
| POST | `/assessment-forms/{id}/new-version/` | Clone as the next version for editing | C |
| PATCH | `/assessment-forms/{id}/` | Activate or deactivate; change weight | C |

### 12.10 Assessments, final report and result

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/placements/{id}/assessments/` | List assessments for a placement (student: only after finalization) | All (scoped) |
| POST | `/placements/{id}/assessments/` | Create a draft assessment with scores per criterion | WS, AS |
| GET | `/assessments/{id}/` | Retrieve an assessment | All (scoped) |
| PATCH | `/assessments/{id}/` | Edit a draft | WS, AS (author) |
| POST | `/assessments/{id}/submit/` | Submit and lock | WS, AS (author) |
| POST | `/placements/{id}/final-report/` | Upload or replace the final report (`multipart`: `document`, `title`) | S |
| GET | `/placements/{id}/final-report/` | Report metadata, status and feedback | All (scoped) |
| GET | `/final-reports/{id}/file/` | Download through a permission check | S, AS, WS, C (scoped) |
| POST | `/final-reports/{id}/accept/` | Accept the report | AS |
| POST | `/final-reports/{id}/return/` | Return with required feedback | AS |
| GET | `/placements/{id}/result/` | Result preview (C, AS) or released result (S) | C, AS, S |
| POST | `/placements/{id}/finalize/` | Finalize and release the result | C |

### 12.11 Notices

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/notices/` | Notices visible to me (audience, dates); filter `period` | Any |
| POST | `/notices/` | Post a notice: title, body, audience (`ALL`, `STUDENTS`, `ACADEMIC_SUPERVISORS`, `WORKPLACE_SUPERVISORS`), optional period, pinned, schedule, `send_email` | C |
| GET | `/notices/{id}/` | Retrieve a notice | Any (scoped) |
| PATCH | `/notices/{id}/` | Edit a notice | C |
| DELETE | `/notices/{id}/` | Archive a notice | C |

### 12.12 Dashboards and reports

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/dashboard/student/` | Student dashboard (section 9.1) | S |
| GET | `/dashboard/academic-supervisor/` | Academic supervisor dashboard (9.2) | AS |
| GET | `/dashboard/workplace-supervisor/` | Industrial supervisor dashboard (9.3) | WS |
| GET | `/dashboard/coordinator/` | Coordinator dashboard (9.4); filter `period` | C |
| GET | `/placements/{id}/summary/` | One placement: hours, weeks, flags, visits, scores, report status | All (scoped) |
| GET | `/reports/periods/{id}/summary/` | **Coordinator's single summary**: one row per placement with status, approved versus required hours, logbook compliance, flags, visits, both assessment percents, report status, total and grade | C, AS (own students) |
| POST | `/reports/export/` | Start an async CSV export `{report, period}`; returns `task_id` | C, AS |
| GET | `/reports/export/{task_id}/` | Export status and signed download link | C, AS |

### 12.13 Platform endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/health/` | Liveness and dependency check (DB, cache, broker, storage) | Public |
| GET | `/api/schema/` | Generated OpenAPI schema | Dev and staging; authenticated in prod |
| GET | `/api/docs/` | **Swagger UI**, generated automatically | Dev and staging; authenticated in prod |
| GET | `/api/redoc/` | ReDoc | Dev and staging |
| GET | `/admin/` | Django admin | Staff; restricted by IP or VPN in prod |

---

## 13. API Documentation (Swagger) and Postman

### 13.1 Swagger (automatic)

- **drf-spectacular** builds the schema from viewsets, serializers and permission classes. No YAML or JSON is written by hand.
- Tags per app (`Auth`, `Placements`, `Logbook`, `Assessments`, `Dashboards`, ...) via `@extend_schema_view`.
- A JWT bearer scheme declared once gives the **Authorize** button.
- Custom actions (`approve`, `submit`, `finalize`) and the two multipart upload endpoints are annotated with `@extend_schema` so request bodies and the shared error envelope appear correctly.
- Dashboard responses use dedicated serializers so each role's payload is documented.
- `drf-spectacular-sidecar` serves Swagger UI assets locally, so docs work offline and under a strict CSP.
- CI runs `manage.py spectacular --validate --fail-on-warn`.
- In production the docs are disabled or require authentication through settings.

### 13.2 Postman

Collection `siams.postman_collection.json`, folders mirror the modules:

```text
SIAMS API
├── 00 Auth             Login as each role, refresh, logout
├── 01 Setup            Create period, import assessment form JSON (both roles), grade bands, users
├── 02 Placement        Student creates organisation and draft, submit; coordinator returns with remarks;
│                       student resubmits; coordinator approves with invite; status timeline
├── 03 Logbook          Create week with daily lines, upload image (multipart), submit,
│                       supervisor returns, student fixes, approve with hours adjustment,
│                       edit after approval (expect 409), missing-week timeline
├── 04 Visits           Schedule, complete
├── 05 Assessments      Both supervisors save and submit, upload final report, accept,
│                       preview result, finalize, student reads result
├── 06 Notices          Post, list as each audience
├── 07 Dashboards       One request per role with shape assertions
├── 08 Reports          Placement summary, period summary, CSV export
└── 99 Security         Student reads another student's placement or image (expect 404),
                        student approves own entry (expect 403), no token (expect 401),
                        upload .exe renamed .jpg (expect 422), oversize file (expect 413 or 422),
                        student reads result before finalize (expect 403 or 404)
```

**Environments:** `local` (`base_url=http://localhost`) and `staging`. Variables: `base_url`, one token per role, `period_id`, `placement_id`, `entry_id`, `image_id`, `form_ids`.

**Scripting**

- Collection-level pre-request script refreshes a role's token before expiry.
- Each request asserts status code, response shape and one business fact (for example, approved hours equal claimed hours minus the adjustment).
- Requests store ids in variables so folders run end to end.
- **Newman** runs the collection in CI against the compose stack (`--working-dir postman` so the upload sample files resolve).

---

## 14. Twelve-Factor Mapping and Configuration

| # | Factor | How this project satisfies it |
|---|---|---|
| I | Codebase | One monorepo; one backend image for every environment |
| II | Dependencies | Pinned `requirements/*.txt`; image contains everything; one `storages/*.txt` chosen per deployment |
| III | Config | Everything from environment variables via `django-environ`; `.env.example` documents it; no secrets in Git |
| IV | Backing services | Postgres, Redis, RabbitMQ, SMTP and **file storage** are all env-configured attachments (`DATABASE_URL`, `REDIS_URL`, `CELERY_BROKER_URL`, `EMAIL_URL`, `STORAGE_BACKEND`) |
| V | Build, release, run | CI builds an immutable image tagged with the commit SHA; migrations run as a release step |
| VI | Processes | Stateless web containers; JWT (no sessions); uploaded files live in object storage, not on the container |
| VII | Port binding | Gunicorn binds `$PORT`; Nginx fronts it |
| VIII | Concurrency | Scale `web` and `worker` independently; exactly one `beat` |
| IX | Disposability | Fast start, graceful SIGTERM, `acks_late` and idempotent tasks |
| X | Dev/prod parity | Same Postgres, Redis, RabbitMQ in dev; optional MinIO container to exercise the S3 path; same dated key layout |
| XI | Logs | JSON to stdout |
| XII | Admin processes | One-off commands in the same image: `migrate`, `seed_demo_data`, `load_assessment_form`, `close_period` |

### 14.1 Settings

```text
config/settings/base.py     common; every value from env with safe defaults
config/settings/storage.py  StorageBackendFactory: STORAGE_BACKEND -> STORAGES["default"]
config/settings/dev.py      DEBUG, debug toolbar, Mailpit, filesystem storage
config/settings/prod.py     HTTPS, HSTS, secure cookies, Sentry, docs protected
config/settings/test.py     fast hasher, eager Celery, locmem cache, temp media dir
```

Switching environments changes **one variable**: `DJANGO_SETTINGS_MODULE`.

### 14.2 `.env.example`

```dotenv
# --- Django ---
DJANGO_SETTINGS_MODULE=config.settings.dev
DJANGO_SECRET_KEY=change-me
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DJANGO_DEBUG=True
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost
TIME_ZONE=Africa/Nairobi

# --- Backing services ---
POSTGRES_DB=siams
POSTGRES_USER=siams
POSTGRES_PASSWORD=siams
DATABASE_URL=postgres://siams:siams@db:5432/siams
REDIS_URL=redis://redis:6379/0
RABBITMQ_DEFAULT_USER=siams
RABBITMQ_DEFAULT_PASS=siams
CELERY_BROKER_URL=amqp://siams:siams@rabbitmq:5672//
EMAIL_URL=smtp://mailpit:1025

# --- File storage: filesystem | s3 | gcs | azure ---
STORAGE_BACKEND=filesystem
MEDIA_ROOT=/app/media
SIGNED_URL_SECONDS=60
# s3 (AWS S3 or any S3-compatible service)
AWS_STORAGE_BUCKET_NAME=
AWS_S3_REGION_NAME=
AWS_S3_ENDPOINT_URL=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
# gcs
GS_BUCKET_NAME=
GOOGLE_APPLICATION_CREDENTIALS=
# azure
AZURE_ACCOUNT_NAME=
AZURE_ACCOUNT_KEY=
AZURE_CONTAINER=

# --- Auth ---
JWT_ACCESS_MINUTES=15
JWT_REFRESH_DAYS=7

# --- Business defaults ---
MAX_HOURS_PER_DAY=12
HOURS_OUTLIER_DAY=10
HOURS_OUTLIER_WEEK=60
MIN_ACTIVITY_CHARS=30
LATE_SUBMISSION_DAYS=7
REVIEW_REMINDER_HOURS=48
REVIEW_ESCALATION_HOURS=72
MAX_IMAGES_PER_WEEK=5
MAX_IMAGE_MB=5
MAX_REPORT_MB=10
REQUIRE_FINAL_REPORT_FOR_RESULT=True

# --- Optional ---
SENTRY_DSN=
```

### 14.3 Development to production

| Step | Development | Production (own server or cloud) |
|---|---|---|
| Run | `docker compose up` | `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`, or the same image on ECS, Cloud Run, Render, Fly or Kubernetes |
| Database | Postgres container | Managed Postgres via `DATABASE_URL` |
| Broker | RabbitMQ container | Managed RabbitMQ (CloudAMQP, Amazon MQ) |
| Cache | Redis container | Managed Redis |
| Email | Mailpit | SES, SendGrid or Mailgun |
| Files | `backend/media/` grouped by day | `STORAGE_BACKEND=s3`, `gcs` or `azure` |
| Image | Built locally | Built in CI, pushed to GHCR, tagged by SHA |
| Secrets | `.env` | Platform secret store |

---

## 15. Testing Strategy and Continuous Integration

### 15.1 Test pyramid

| Level | Tooling | What it covers |
|---|---|---|
| **Unit (pure, no DB)** | pytest | `week_start`, `weeks_between`, `normalize_and_hash`, every `LogbookRule`, `WeightedPercentStrategy`, state-transition maps, file validators |
| **Service / integration** | pytest-django, factory-boy, freezegun | Placement lifecycle, logbook save, submit, approve with adjustments, review SLA with frozen time, form versioning and locking, result finalization |
| **Storage** | moto, temp directory | Dated key layout; filesystem and mocked-S3 backends behave the same; signed URL redirect; EXIF removed from stored image |
| **API** | DRF `APIClient` | Serialization, status codes, **permission matrix** (every role against every endpoint), multipart uploads |
| **Task** | Celery eager mode | `flag_missing_weeks`, `remind_pending_reviews`, `escalate_overdue`, CSV import and export; run twice yields the same result |
| **Performance guard** | `django_assert_max_num_queries` | Dashboards and list endpoints do not N+1 |
| **Contract / smoke** | Postman + Newman | Full lifecycle against the running compose stack |

**Must-have tests**

- Permission matrix; student A can never read student B's placement, logbook, image or report (expect 404).
- Placement transitions: illegal transitions return 409; edits blocked outside `DRAFT` and `RETURNED`.
- Approval without both supervisors fails; invite creates exactly one workplace supervisor account.
- Logbook: future date, hours above 12, date outside placement, and short description are rejected; duplicate text raises a flag; approved weeks are immutable.
- Progress counts **approved hours only**.
- A locked assessment form cannot be edited (409); a new version leaves old results unchanged.
- Total percent and grade for known inputs, including grade band boundaries.
- Upload attacks: renamed executable, oversize file, decompression-bomb image, path traversal in file name.
- No endpoint returns a direct storage URL; downloads need permission.
- `makemigrations --check` shows no drift.

**Quality gates:** coverage at least 85% overall (higher for `services.py`, `rules.py`, `scoring.py`), ruff clean, `check --deploy` clean on production settings, no high bandit or pip-audit findings, OpenAPI schema valid.

### 15.2 GitHub Actions: `.github/workflows/backend-ci.yml`

```yaml
name: backend-ci

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

concurrency:
  group: backend-ci-${{ github.ref }}
  cancel-in-progress: true

env:
  PYTHON_VERSION: "3.12"
  DJANGO_SETTINGS_MODULE: config.settings.test
  DJANGO_SECRET_KEY: ci-only-secret
  DATABASE_URL: postgres://siams:siams@localhost:5432/siams
  REDIS_URL: redis://localhost:6379/0
  STORAGE_BACKEND: filesystem
  MEDIA_ROOT: /tmp/siams-media

jobs:
  quality:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: pip
          cache-dependency-path: backend/requirements/*.txt
      - run: pip install -r requirements/dev.txt
      - name: Lint and format check
        run: |
          ruff check .
          ruff format --check .
      - name: Security scan (code)
        run: bandit -r apps config -ll
      - name: Security scan (dependencies)
        run: pip-audit -r requirements/base.txt

  test:
    runs-on: ubuntu-latest
    needs: quality
    defaults:
      run:
        working-directory: backend
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: siams
          POSTGRES_USER: siams
          POSTGRES_PASSWORD: siams
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U siams"
          --health-interval 5s --health-timeout 5s --health-retries 10
      redis:
        image: redis:7
        ports: ["6379:6379"]
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s --health-timeout 5s --health-retries 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: pip
          cache-dependency-path: backend/requirements/*.txt
      - run: pip install -r requirements/dev.txt
      - name: Migrations are in sync with models
        run: python manage.py makemigrations --check --dry-run
      - name: OpenAPI schema is valid
        run: python manage.py spectacular --validate --fail-on-warn --file /tmp/schema.yml
      - name: Run tests with coverage
        run: pytest --cov=apps --cov-report=xml --cov-report=term-missing --cov-fail-under=85 -n auto
      - name: Deployment checks (production settings)
        env:
          DJANGO_SETTINGS_MODULE: config.settings.prod
          DJANGO_ALLOWED_HOSTS: example.com
        run: python manage.py check --deploy --fail-level WARNING
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: backend/coverage.xml

  docker-and-contract:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - name: Prepare env
        run: cp .env.example .env
      - name: Build and start stack
        run: docker compose up -d --build --wait db redis rabbitmq backend worker nginx
      - name: Seed demo data and sample rubric
        run: |
          docker compose exec -T backend python manage.py seed_demo_data
      - name: Run Postman collection with Newman
        run: |
          npm install -g newman
          newman run postman/siams.postman_collection.json \
            -e postman/local.postman_environment.json \
            --working-dir postman --bail
      - name: Dump logs on failure
        if: failure()
        run: docker compose logs --no-color
      - name: Tear down
        if: always()
        run: docker compose down -v
```

---

## 16. Containerization

### 16.1 `backend/Dockerfile` (multi-stage)

```dockerfile
# ---------- base ----------
FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

# ---------- dev ----------
FROM base AS dev
COPY requirements/ requirements/
RUN pip install -r requirements/dev.txt
COPY . .
RUN mkdir -p /app/media
ENTRYPOINT ["scripts/entrypoint.sh"]
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# ---------- builder (prod) ----------
FROM base AS builder
ARG STORAGE_EXTRA=s3            # s3 | gcs | azure   (build-arg picks the provider)
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*
COPY requirements/ requirements/
RUN pip wheel --wheel-dir /wheels \
        -r requirements/prod.txt \
        -r requirements/storages/${STORAGE_EXTRA}.txt

# ---------- prod ----------
FROM base AS prod
COPY --from=builder /wheels /wheels
RUN pip install --no-index --find-links=/wheels /wheels/* && rm -rf /wheels
COPY . .
RUN DJANGO_SETTINGS_MODULE=config.settings.test python manage.py collectstatic --noinput
RUN useradd --create-home appuser && mkdir -p /app/media && chown -R appuser /app
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:8000/health/ || exit 1
ENTRYPOINT ["scripts/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "30"]
```

### 16.2 `docker-compose.yml` (development)

The `frontend` service is behind a Compose **profile**, so it is ignored until you design the frontend (`docker compose --profile frontend up`). The `minio` service is also optional (`--profile s3`) for testing the cloud-storage path locally.

```yaml
name: siams

x-backend: &backend
  build:
    context: ./backend
    target: dev
  env_file: .env
  volumes:
    - ./backend:/app
    - ./backend/media:/app/media     # dev uploads land in backend/media, grouped by day
  depends_on:
    db:       { condition: service_healthy }
    redis:    { condition: service_healthy }
    rabbitmq: { condition: service_healthy }

services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports: ["5432:5432"]            # dev only
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10

  rabbitmq:
    image: rabbitmq:3.13-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_DEFAULT_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_DEFAULT_PASS}
    ports: ["15672:15672"]          # management UI, dev only
    volumes:
      - rabbitdata:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 10s
      timeout: 10s
      retries: 10

  mailpit:
    image: axllent/mailpit
    ports: ["8025:8025"]            # read outgoing email here

  minio:                            # optional: S3-compatible storage for parity tests
    profiles: ["s3"]
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports: ["9000:9000", "9001:9001"]
    volumes:
      - miniodata:/data
    # To use: create a bucket in the console, then set
    # STORAGE_BACKEND=s3, AWS_S3_ENDPOINT_URL=http://minio:9000 and the keys in .env

  backend:
    <<: *backend
    command: python manage.py runserver 0.0.0.0:8000
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health/"]
      interval: 15s
      timeout: 5s
      retries: 10
    expose: ["8000"]

  worker:
    <<: *backend
    command: celery -A config worker -l info -Q default,notifications,reports

  beat:
    <<: *backend
    command: celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler

  nginx:
    image: nginx:1.27-alpine
    volumes:
      - ./infra/nginx/nginx.dev.conf:/etc/nginx/conf.d/default.conf:ro
    ports: ["80:80"]
    depends_on:
      backend: { condition: service_healthy }

  # ---- Frontend: enabled later with `--profile frontend` ----
  frontend:
    profiles: ["frontend"]
    build:
      context: ./frontend
      target: dev
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      VITE_API_BASE_URL: /api/v1
    expose: ["5173"]

volumes:
  pgdata:
  redisdata:
  rabbitdata:
  miniodata:
```

### 16.3 `docker-compose.prod.yml` (overrides)

```yaml
# Usage: docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
# With managed Postgres, Redis, RabbitMQ and object storage, delete those
# services and point the *_URL / STORAGE_* variables at the managed endpoints.

x-prod-backend: &prod-backend
  build:
    context: ./backend
    target: prod
    args:
      STORAGE_EXTRA: s3             # s3 | gcs | azure, must match STORAGE_BACKEND
  image: ghcr.io/<org>/siams-backend:${IMAGE_TAG:-latest}
  restart: unless-stopped
  volumes: []                       # no source mounts in production

services:
  db:
    ports: []
    restart: unless-stopped
  redis:
    restart: unless-stopped
  rabbitmq:
    ports: []
    restart: unless-stopped
  mailpit:
    profiles: ["dev-only"]
  minio:
    profiles: ["dev-only"]

  backend:
    <<: *prod-backend
    command: gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 30
    volumes:
      - staticfiles:/app/staticfiles
      # Only if STORAGE_BACKEND=filesystem on a single server:
      # - media:/app/media
  worker:
    <<: *prod-backend
    command: celery -A config worker -l info -Q default,notifications,reports --concurrency 4
  beat:
    <<: *prod-backend

  nginx:
    restart: unless-stopped
    volumes:
      - ./infra/nginx/nginx.prod.conf:/etc/nginx/conf.d/default.conf:ro
      - staticfiles:/var/www/static:ro
      - ./infra/certs:/etc/nginx/certs:ro
    ports: ["80:80", "443:443"]

volumes:
  staticfiles:
  media:
```

### 16.4 Nginx (`infra/nginx/nginx.dev.conf`)

```nginx
upstream backend  { server backend:8000; }
upstream frontend { server frontend:5173; }   # used once the frontend profile is enabled

limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

server {
    listen 80;
    client_max_body_size 12m;                 # largest upload is the 10 MB report plus overhead

    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    location /api/    { proxy_pass http://backend; include /etc/nginx/proxy_params; }
    location /auth/   { limit_req zone=login burst=5 nodelay; proxy_pass http://backend; }
    location /admin/  { proxy_pass http://backend; }
    location /health/ { proxy_pass http://backend; }
    location /static/ { proxy_pass http://backend; }   # dev: Django serves static; prod serves a volume

    # No /media/ route: uploaded files are never public; they go through /api/.../file/

    location / {                                       # React app
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;        # Vite hot reload
        proxy_set_header Connection "upgrade";
    }
}
```

`proxy_params` is a small include with the usual `Host`, `X-Real-IP`, `X-Forwarded-For` and `X-Forwarded-Proto` headers. In production the same file serves `/static/` from the shared volume and the built React files at `/`, with TLS.

### 16.5 Process types and Celery design

| Process | Command | Scales by |
|---|---|---|
| `backend` | `gunicorn config.wsgi` | More replicas behind Nginx |
| `worker` | `celery -A config worker` | More replicas or concurrency; separate queues `default`, `notifications`, `reports` |
| `beat` | `celery -A config beat` | **Exactly one** |

RabbitMQ is the broker; Redis stores results, cache and throttle counters. Tasks use `acks_late`, retry with exponential backoff and are idempotent.

| Task | Schedule (Africa/Nairobi) |
|---|---|
| `flag_missing_weeks` | Mondays 08:00 |
| `remind_pending_reviews` | Hourly |
| `escalate_overdue` | Hourly |
| `remind_assessments_due` | Daily 08:00, from `assessment_opens_on` |
| `cleanup_orphan_files` | Weekly (files with no database row) |

---

## 17. Security Design

| Area | Measure |
|---|---|
| Authentication | Closed registration; JWT access 15 min; rotating, blacklisted refresh token in an HttpOnly, Secure, `SameSite=Strict` cookie (same-origin deployment); Argon2 hashing; password validators; `django-axes` lockout |
| Authorization | Role permission classes **plus** selector-scoped querysets on every read; out-of-scope objects return 404; `django-rules` predicates covered by the permission-matrix test |
| Input and output | Serializer validation everywhere; ORM only; length caps on all text fields |
| Integrity | Server decides status, time and totals; approved weeks and submitted assessments are locked; history tables on key models; locked rubric versions keep old results reproducible |
| **File uploads** | Extension allow-list **and** magic-byte check (`filetype`); size limits at Nginx, serializer and service; Pillow `verify()` and pixel limit against decompression bombs; images re-encoded and **EXIF stripped** (removes hidden GPS data); random UUID file names; original name stored only as data; no execution or listing of the upload location |
| **File access** | Buckets and folders private; downloads through permission-checked endpoints; cloud files served by 60-second signed URLs; `Content-Disposition: attachment` and `nosniff` for documents; optional ClamAV scan task later |
| Transport | HTTPS only in production, HSTS, secure cookies, strict CORS (not needed when same-origin) |
| Rate limiting | DRF throttles on Redis, Nginx `limit_req` on login |
| Secrets | Environment or platform secret store; `.env` git-ignored; storage credentials scoped to one bucket with least privilege |
| Infrastructure | Non-root containers; DB, Redis and RabbitMQ not public; admin restricted by IP or VPN |
| Supply chain | `pip-audit`, `bandit`, Dependabot, pinned versions, image scanning |
| Privacy | Collect only what the workflow needs; retention policy for logbook images and reports after a period is archived; students informed about who can view their files. Personal data is covered by Kenya's Data Protection Act, 2019, so confirm the institution's obligations before launch. |
| Operations | JSON logs without sensitive values, Sentry, `/health/` monitored, automated database backups and bucket versioning, periodic restore tests |

---

## 18. Suggested Build Order

| Phase | Deliverable | Done when |
|---|---|---|
| 0 | Repo, compose stack, settings split, storage factory, CI skeleton, `/health/`, Swagger | `docker compose up` works; CI green on an empty project |
| 1 | `accounts`: user model, login, roles, CSV import, invite | Permission-matrix tests pass for users |
| 2 | `placements`: periods, organizations, placement lifecycle, supervisor assignment, timeline | Student submits, coordinator approves and assigns end to end |
| 3 | `logbook`: weekly entries, rules, flags, review, timeline with missing weeks | Full review loop works with frozen-time tests |
| 4 | `core/storage` + logbook images | Same tests pass on filesystem and mocked S3; EXIF stripped |
| 5 | `notifications`: email channel and receivers; reminder and escalation tasks | Events from phases 2 and 3 send emails |
| 6 | `visits` | Academic supervisor schedules and completes visits |
| 7 | `assessments`: form import and versioning, scoring, assessments, final report, result | Official rubric loads from JSON; result matches hand calculation |
| 8 | `notices` | Coordinator posts; audiences see the right notices |
| 9 | `reports`: four dashboards, placement summary, period summary, CSV export | Dashboards pass query-count tests |
| 10 | Hardening: `check --deploy`, upload attack tests, backup and restore drill, production compose | Ready to deploy |
| 11 | Frontend (your separate design) plugs into `/api/v1/` and the `frontend` compose profile | |

---

## 19. Deferred: Geofenced Attendance (future)

Geofencing is excluded from the MVP because GPS radius checks are unreliable in dense urban areas where buildings are adjacent. The design leaves a clean extension path:

- **Additive only.** A future `apps/attendance` app adds `AttendanceRecord` and rule classes; existing tables keep working. Organizations would gain optional latitude, longitude and radius columns (nullable, so no impact now).
- **Same architecture.** Checks would be `AttendanceRule` strategies in a rule chain (like `LogbookRule`), emitting flags rather than hard rejections.
- **Cross-check, not replacement.** Attendance data would be compared against logbook hours (for example, a logged day with no check-in raises a flag); the workplace supervisor's verification stays the primary control.
- **Alternatives worth evaluating for urban sites** when the time comes: a QR code shown by the workplace supervisor that the student scans daily, or supervisor-side daily confirmation, both of which avoid GPS accuracy problems.

---

## 20. Decisions

**Confirmed**

1. Web app; internet connectivity assumed.
2. Geofencing deferred (section 19).
3. Assessment rubric comes from the institution's official form and is implemented as data (section 8).
4. One workplace supervisor per placement.
5. Evidence uploads excluded, except images in the weekly logbook. Development files go in `backend/media/` grouped by day; production uses `django-storages` with the provider chosen by `STORAGE_BACKEND`.

**Still open (defaults assumed above)**

1. **Final report required before the result is finalized?** Default: yes (`REQUIRE_FINAL_REPORT_FOR_RESULT=True`).
2. **Weighting between the two evaluation forms** (and any pass mark) comes from the official form; the design only needs the numbers.
3. **Working days** per period (Monday to Friday assumed; weekend entries are allowed but flagged).
4. **Retention period** for logbook images and reports after a period closes.
5. **Who may see peer-duplicate details:** currently coordinator and academic supervisor only.
6. **Email provider** for production (SES, SendGrid, Mailgun or the institution's SMTP).
