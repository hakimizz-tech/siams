## What and why
<!-- One or two sentences. Link the issue. -->

## Team and apps touched
- [ ] Alpha  (core, accounts, placements, assessments, reports)
- [ ] Beta   (logbook, visits, notices, notifications)

## Rules of engagement
- [ ] No cross-team imports of `services.py` or models (events and selectors only; `make imports` passes)
- [ ] New cross-team signal or selector is documented in `docs/CONTRACTS.md`
- [ ] Routes live in my app's `urls.py`; I did not edit `config/urls.py`
- [ ] Migrations included, only for my own apps

## Quality
- [ ] Tests added or updated (`make test`)
- [ ] Permissions covered (wrong role gets 403, other user's record gets 404)
- [ ] `make lint` passes
- [ ] Swagger output looks right at `/api/docs/`
