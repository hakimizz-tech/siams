# frontend

React + TypeScript + Vite + Tailwind v4 + shadcn/ui. Design: `docs/frontend-design.md`.

## Run

```bash
make up-frontend       # whole stack, app on http://localhost (Nginx -> Vite, API on the same origin)
make seed              # demo users (password Password123!): coordinator@, academic@, mentor@, student1@, student2@ @siams.local
make fe-types          # regenerate src/types/api.d.ts from the live backend schema, then commit it
make fe-test           # unit, component and integration tests
make fe-lint           # ESLint + Prettier
make fe-e2e            # Playwright against the Docker stack
```

Windows/macOS hot reload not firing? Put `FRONTEND_USE_POLLING=true` in `.env`, then `make up-frontend`.

## How pages are added (you build the UI, the router finds it)

A route lights up as soon as its file exists: create the file and `export default` the component.
Until then the route shows "Page not built yet". The registry is `src/app/pages.ts`.

| Route area                     | Put the page in                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------- |
| Landing (static, no API calls) | `src/pages/landing/landing-page.tsx`                                              |
| Error pages                    | `src/pages/errors/{not-found,forbidden,server-error}.tsx`                         |
| Auth                           | `src/features/auth/pages/{login,forgot-password,reset-password,profile}-page.tsx` |
| Everything else                | `src/features/<feature>/pages/<name>-page.tsx` (see `PAGES` for exact names)      |

The signed-in shell (`src/app/layouts/app-layout.tsx`) is functional but unstyled: replace it with
the shadcn Sidebar. Keep `<nav aria-label="Main">`: the tests and e2e specs look for it.

## Rules the code enforces

1. **Only `src/lib/api` imports axios** (ESLint). Features call typed helpers: `get/post/patch/put/del/upload`.
2. **URLs live only in `src/features/*/api.ts`**, always with a trailing slash. Components import hooks, never paths.
3. **Every mutation declares what it refreshes** (`invalidate:` in `hooks.ts`). Add a test in `src/test/hooks.test.tsx`.
4. **Types come from the backend schema** (`src/types/api.d.ts`, generated). `src/types/domain.ts` is a hand-written
   layer that must match it; when they disagree the generated file wins.
5. **Lib never imports UI or features; features import each other only through `index.ts`** (ESLint).
6. **No secrets, no tokens in storage.** The access token lives in memory only (`lib/api/auth-token.ts`).

## Tests

| Where                                | What                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `src/**/*.test.ts(x)`                | unit and integration (Vitest + MSW). Unhandled API requests FAIL the test |
| `src/test/features.contract.test.ts` | every API function hits the right method and path                         |
| `src/test/hooks.test.tsx`            | cache invalidation rules                                                  |
| `src/test/schemas.test.ts`           | form rules mirrored from the backend                                      |
| `e2e/tests`                          | Playwright against the real stack                                         |
