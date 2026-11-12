# SIAMS: Student Internship & Attachment Management System

Monorepo: **Django + DRF backend** (`backend/`) and a **React web app** (`frontend/`, designed separately).

| Path | What |
|---|---|
| `backend/` | Django project. Apps live in `backend/apps/` |
| `frontend/` | React web app (placeholder) |
| `infra/` | Nginx configuration |
| `postman/` | Postman collection and environments (also run in CI with Newman) |
| `docs/` | Design document, team rules, contracts between teams |
| `docker-compose.yml` | Development stack |
| `docker-compose.prod.yml` | Production overrides |

## Setup and development

The recommended development environment uses Docker Desktop or Docker Engine with
Docker Compose. The stack includes PostgreSQL, Redis, RabbitMQ, Mailpit, the
Django backend, Celery worker/beat processes, and Nginx. The frontend is an
optional profile because it is currently a scaffold.

### Windows

Install and start [Docker Desktop](https://www.docker.com/products/docker-desktop/),
then open **Command Prompt** in the repository root:

```cmd
setup.bat up
setup.bat superuser
```

`setup.bat` is the Windows equivalent of the Makefile and supports the project
setup, Docker lifecycle, migrations, tests, linting, OpenAPI validation, Alpha
checks, reports checks, production commands, and optional profiles:

```cmd
setup.bat help
setup.bat up-frontend
setup.bat up-s3
setup.bat migrate
setup.bat test
setup.bat lint
setup.bat logs backend
```

The same script works from PowerShell:

```powershell
.\setup.bat up
```

### macOS and Linux

Install Docker Desktop (macOS) or Docker Engine plus the Docker Compose plugin
(Linux). GNU Make is also required:

```bash
make up            # creates .env on first run, builds and starts everything
make superuser     # create the first coordinator
```

Useful commands:

```bash
make help
make migrate
make test
make lint
make schema
make logs s=backend
make up-frontend   # optional frontend profile
make up-s3         # optional MinIO/S3 profile
```

If Make is not installed on macOS, install it with Homebrew:

```bash
brew install make
```

On Linux, install it with the distribution package manager, for example:

```bash
sudo apt update
sudo apt install make
```

### First-run notes

Both entry points create `.env` from `.env.example` when it does not exist.
Review the generated values before using the project outside local development;
never commit `.env` or real credentials.

The backend bind mount means source changes are visible to the development
container. Rebuild images after changing the Dockerfile or dependency files:

```bash
make up
```

On Windows:

```cmd
setup.bat up
```

Apply migrations explicitly when needed:

```bash
make migrate          # macOS/Linux
setup.bat migrate     # Windows
```

Use `make ps` or `setup.bat ps` to inspect service health. If startup fails,
confirm Docker Desktop/Engine is running and inspect logs with `make logs
s=backend` or `setup.bat logs backend`.

| What | URL |
|---|---|
| App entry point (Nginx) | http://localhost |
| Swagger UI (auto-generated) | http://localhost/api/docs/ |
| ReDoc | http://localhost/api/redoc/ |
| Health | http://localhost/health/ |
| Django admin | http://localhost/admin/ |
| Mailpit (all outgoing email) | http://localhost:8025 |
| RabbitMQ management | http://localhost:15672 (siams / siams) |

## Teams

Work is split between **Team Alpha** and **Team Beta**. Read these before writing code:

- [`docs/TEAMS.md`](docs/TEAMS.md): ownership, rules of engagement, milestones
- [`docs/CONTRACTS.md`](docs/CONTRACTS.md): domain events, selectors, URL ownership
- [`docs/internship-system-design.md`](docs/internship-system-design.md): the full system design
