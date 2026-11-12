# Contributing

1. Read [`docs/TEAMS.md`](docs/TEAMS.md) and [`docs/CONTRACTS.md`](docs/CONTRACTS.md).
2. Make changes on `main` and push directly to `main`. You do not need to create a contributor branch.
3. Keep changes small and inside your own apps. Cross-team needs go through **events** and **selectors**.
4. Run `make lint test` before pushing. CI must be green (lint, import boundaries, migrations, OpenAPI, tests, coverage).
5. Commit messages follow Conventional Commits (`feat(placements): ...`, `fix(logbook): ...`).
6. Never edit another team's migrations or models without agreeing with the affected team first.
