# Social Cup Admin Web

The internal admin web app for Social Cup staff: log in with an administrator account and
manage the platform. **Phase 1** implemented the foundation and authentication. **Phase 2**
adds Cafe Management (create, edit, status change). Drink/member/subscription/redemption/
payout/audit-log management are separate, later phases.

## Admin authentication

There is no separate `/admin/login` endpoint and no separate admin authentication system.
An administrator is a `Member` row whose persisted `role` column is `ADMIN` (see the
backend's "completed backend admin authentication" checkpoint) - this app authenticates
through the exact same `POST /auth/login` / `POST /auth/refresh` every member uses, and
simply requires the returned `user.roles` to include `ADMIN` before treating the session
as usable here. A valid login for a non-admin member is rejected client-side with an
"Admin access required" message; no admin API call is ever attempted for it. The backend's
own `/admin/** -> hasRole(ADMIN)` rule (untouched) remains the actual authorization
authority regardless of anything this app decides.

## Cafe Management (Phase 2)

Routes: `/cafes` (search), `/cafes/new` (create), `/cafes/:id` (view/edit + status change).
All three require an authenticated ADMIN session, via the same `ProtectedRoute` Phase 1
already established - no new authentication code was added.

### Endpoints consumed

| Purpose | Endpoint | Notes |
| --- | --- | --- |
| Search for a cafe | `GET /cafes/search` (public) | Same endpoint mobile/barista-web use |
| Load a cafe by ID | `GET /cafes/{id}` (public) | Missing `payoutRate` - see below |
| Create a cafe | `POST /admin/cafes` | Admin-only, `CreateCafeRequest` |
| Update a cafe | `PUT /admin/cafes/{id}` | Admin-only, `UpdateCafeRequest` |
| Change a cafe's status | `PATCH /admin/cafes/{id}/status` | Admin-only, `{status}` |

### Important limitations (by design, not a bug)

**There is no admin cafe listing endpoint, and no admin get-by-id endpoint.** The backend's
`AdminCafeController` only exposes create/update/status-change - it has no `@GetMapping` at
all. Because of this:

- **`/cafes` is a search screen, not "All Cafes."** It calls the same public
  `GET /cafes/search` mobile/barista-web use, which the backend hardcodes to `CafeStatus.ACTIVE`
  everywhere (`CafeService.searchCafes`/`getCafes`/`getFeaturedCafes` all do this - there is no
  status parameter to override it). **Inactive and archived cafes cannot be found by search.**
  The screen states this explicitly and never labels the search "all cafes."
- **To reach an inactive/archived cafe, an admin must already know its ID** and open
  `/cafes/<id>` directly (the search screen has a small "open by ID" form for this). This app
  never fabricates a list of such cafes - if you don't know the ID, this app cannot show it to
  you, and does not pretend otherwise.
- **The Edit screen (`/cafes/:id`) cannot always show the cafe's payout rate.** The public
  `GET /cafes/{id}` response has no `payoutRate` field (only the admin create/update endpoints'
  responses do). Two cases:
  - Right after creating or updating a cafe in the same session, the full admin response
    (including `payoutRate`) is carried forward via router state, so the Edit screen shows the
    real value.
  - Arriving "cold" (via search, or a typed ID), only the public response is available. The
    Payout rate field is shown with an explicit "not returned by the public cafe endpoint"
    label and is left blank. This is safe to submit blank: the backend's `CafeMapper.updateEntity`
    only overwrites `payoutRate` when the request supplies a non-null value - a blank field
    preserves whatever the cafe's payout rate already was. The app never fabricates a default
    value for it.
  - Every other field the update form doesn't ask about (opening hours, photos) is round-tripped
    unchanged from whichever detail response was loaded - the mapper overwrites those
    unconditionally, so omitting them would silently wipe them. Editing hours/photos is out of
    scope for this phase.
- No financial value (payout rate) is ever computed client-side - it is a plain, passed-through
  number the admin enters, validated only against the same 0.0-1.0 range the backend itself
  enforces (a presentational pre-check, not a new rule).
- A cafe's status change is only ever shown as successful once the backend's response confirms
  it - the confirmation dialog shows current vs. requested status and never assumes success
  before the request resolves.

No fake or mock cafe data is used anywhere in this app.

## Prerequisites

- Node.js 20+ and npm
- The Social Cup `backend` running and reachable (see `../backend/README.md`), with at
  least one `Member` row promoted to `ADMIN` (a direct database operation - see the
  backend's own admin-authentication checkpoint notes; there is no in-app way to do this)

## Install

```bash
npm install
```

## Environment configuration

Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to the backend's base URL,
including the `/api` context path:

```bash
cp .env.example .env
# .env
VITE_API_BASE_URL=http://localhost:8080/api
```

If unset, `npm run dev` falls back to `http://localhost:8080/api` automatically (local
development only). A production build has no fallback and fails fast at startup if
`VITE_API_BASE_URL` is missing - no server URL is ever assumed (see `src/config/env.ts`).

## Available commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`src/`) and produce a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run the test suite once (Vitest) |
| `npm run test:watch` | Run the test suite in watch mode |
| `npm run typecheck` | Type-check `src/` and `tests/` together, without emitting |
| `npm run lint` | Lint with oxlint |

## Project structure

Mirrors barista-web's own architecture and conventions (same stack, same Axios/session/
refresh-interceptor design, same CSS Modules approach) - adapted for a desktop-first admin
shell instead of a phone-first scanner flow.

```text
src/
├── api/          # shared Axios client, auth-expiry pub/sub, shared QueryClient
├── auth/         # session context, sessionStorage, admin login/refresh calls
├── components/   # shared UI primitives (Button, Input, Card, LoadingState, ErrorState)
├── config/       # env.ts
├── features/
│   └── cafes/    # cafe API calls, types, query keys, hooks, form helpers, CafeForm/
│                 # CafeStatusDialog components - mirrors mobile/barista-web's own
│                 # features/<domain>/ convention (introduced in Phase 2, the first
│                 # domain feature; Phase 1 was pure auth/foundation)
├── routes/       # AppRouter, ProtectedRoute, PublicRoute
├── screens/      # Login, Dashboard, CafeList, CafeCreate, CafeDetail
├── types/        # shared ApiError/PageResponse shapes
└── utils/        # errors.ts (safe error-message mapping, AdminAccessRequiredError,
                  # extractFieldErrors)
```

One deliberate deviation from the phase plan's proposed tree: the actual `loginAdmin`/
`refreshAdmin` request functions live in `src/auth/authApi.ts` only, not duplicated under
`src/api/` as well - mirroring barista-web's own `src/auth/api.ts` convention exactly and
avoiding a genuinely redundant second copy of the same two functions.

## Security notes

- Access token: held in memory only (a module-level variable in `src/api/client.ts`),
  never persisted anywhere.
- Refresh token: `sessionStorage` only (cleared on logout and when the tab/browser
  closes) - never `localStorage`, never a cookie.
- No role is ever sent by this app - `LoginRequest`/`RefreshTokenRequest` have no such
  field on the backend, and the ADMIN check is performed entirely on the backend's own
  response.

## Testing

Vitest + React Testing Library, mirroring barista-web's testing conventions:

```bash
npm test
```
