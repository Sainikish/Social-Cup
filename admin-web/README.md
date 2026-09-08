# Social Cup Admin Web

The internal admin web app for Social Cup staff: log in with an administrator account and
manage the platform. **Phase 1** implemented the foundation and authentication. **Phase 2**
added Cafe Management (create, edit, status change). **Phase 3** added Drink/Menu Management
(create, edit, status change, per-cafe display). **Phase 4** added Member Management (suspend,
reactivate). **Phase 5** adds a read-only Subscription list - see below for what this
deliberately does NOT include, and why. Redemption/payout/audit-log management and dashboard
metrics are separate, later phases.

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

## Drink Management (Phase 3)

Entry points: a "Drinks" section on Cafe Detail (showing the cafe's active drinks embedded
in its own detail response, plus "Add Drink" / "Manage Drinks" links) and three routes:
`/cafes/:cafeId/drinks` (browse), `/cafes/:cafeId/drinks/new` (create), `/drinks/:drinkId`
(view/edit + status change). All require an authenticated ADMIN session via the same
`ProtectedRoute` Phase 1 established.

### Endpoints consumed

| Purpose | Endpoint | Notes |
| --- | --- | --- |
| List a cafe's drinks | `GET /cafes/{id}/drinks` (public) | Same endpoint mobile/barista-web use |
| Load a drink by ID | `GET /drinks/{id}` (public) | Finds ACTIVE/INACTIVE only - see below |
| Create a drink | `POST /admin/cafes/{cafeId}/drinks` | Admin-only, `CreateDrinkRequest` |
| Update a drink | `PUT /admin/drinks/{id}` | Admin-only, `UpdateDrinkRequest` |
| Change a drink's status | `PATCH /admin/drinks/{id}/status` | Admin-only, `{status}` |

Unlike Cafe, the backend returns the exact same `DrinkResponse` shape from every one of these
endpoints - there is no admin-only drink DTO and no field (such as Cafe's `payoutRate`) that
one response has and another lacks. There is also no `DrinkType` enum in the backend - `type`
is a plain free-text field, so this app does not present it as a fixed dropdown.

### Important limitations (by design, not a bug)

**There is no admin drink-list endpoint, and no admin get-drink-by-id endpoint.**
`AdminDrinkController` only exposes update and status-change; creation lives on
`AdminCafeController` instead. Because of this:

- **The Drinks screens are browse-only, not "All Drinks."** `GET /cafes/{id}/drinks`
  (`DrinkService.getDrinksByCafe`) hardcodes `includeInactive=false` - **inactive and archived
  drinks never appear there.** The same limitation applies to the drinks embedded directly in
  `CafeDetailResponse`/`AdminCafeDetailResponse` (`CafeService` calls
  `drinkService.getActiveDrinksForCafe`, ACTIVE only). This app labels both surfaces
  "active drinks only" and never implies a complete list.
- **Archiving a drink is effectively permanent through this app.** Every drink lookup and
  write path on the backend (`getDrinkById`, `updateDrink`, `updateDrinkStatus`) requires
  `findByIdAndArchivedAtIsNull` - once a drink is archived, the public detail endpoint 404s
  for it and the admin update/status endpoints would too. There is no way for this app to
  view, edit, or reactivate a drink after archiving it. The status-change confirmation dialog
  states this explicitly before an admin confirms an ARCHIVED request.
- A brand-new cafe (no drinks yet) and a cold arrival at a drink's detail screen are both
  handled without fabricating data: an empty drinks list renders as "No active drinks at this
  cafe yet," never a fake placeholder drink.
- No financial value is computed client-side - `retailPrice` and `creditPrice` are independent,
  directly-entered fields with no derived relationship between them, validated only against the
  same ranges (`retailPrice >= 0.01`, `creditPrice >= 1` whole number) the backend itself
  enforces.
- A drink's status change is only ever shown as successful once the backend's response confirms
  it, exactly like Cafe status changes.

No fake or mock drink data is used anywhere in this app. Drink search, pagination controls,
filtering, moving a drink between cafes, and deleting a drink are all out of scope for this
phase (the backend supports none of them either, except pagination parameters the underlying
list endpoint accepts but this app does not expose UI controls for).

## Member Management (Phase 4)

Entry points: a "Manage Members" button on the Dashboard, leading to `/members` (enter a known
member ID) and `/members/:memberId` (view/suspend/reactivate). Both require an authenticated
ADMIN session via the same `ProtectedRoute` Phase 1 established.

### Endpoints consumed

| Purpose | Endpoint | Notes |
| --- | --- | --- |
| Suspend a member | `POST /admin/members/{memberId}/suspend` | Admin-only, no request body |
| Reactivate a member | `POST /admin/members/{memberId}/reactivate` | Admin-only, no request body |

Both return the same `MemberDto` returned by `GET /auth/me` - there is no separate admin-only
member DTO. Neither endpoint accepts a request body on the backend (`AdminMemberController` has
no `@RequestBody` parameter on either method) - the actor's identity comes entirely from the
JWT, and this app never sends one.

### Important limitations (by design, not a bug)

**There is no member-list endpoint, no member-search endpoint, and no way to look up an
arbitrary member by ID at all** - not even a public one. Unlike Cafe/Drink, `MemberDto` is
returned by exactly two things: `GET /auth/me` (the caller's own record, unusable for looking
up someone else) and the suspend/reactivate responses (the acted-on member's own record).
Because of this:

- **`/members` is not a member directory.** It exists only to route a known member ID to
  `/members/:memberId` - it explicitly states that listing and search both require a backend
  API that does not exist yet, and are deferred.
- **`/members/:memberId` cannot show a member's details until an action has been performed on
  them in the current session.** Arriving at the URL directly (or via a fresh page load) shows
  an explicit "details are not available, no lookup endpoint exists" notice and a status badge
  reading "Unknown" - never a fabricated status or profile. Once a suspend/reactivate response
  is in hand (carried via router state, or freshly returned to this same screen), the real
  `MemberDto` fields are shown, and only the one valid action (Suspend or Reactivate) is offered
  going forward. Before that, with status genuinely unknown, both actions are offered - the
  confirmation dialog says so explicitly, and the backend's own 409 response is the real
  enforcement point if the wrong one is chosen.
- **Credit balance and redemption/activity history are both deferred - neither has a backend
  API this app can safely call for an arbitrary member.** `GET /users/me/credits` is
  self-only. No redemption-history-by-member endpoint exists at all.
- The suspend/reactivate confirmation dialog shows the member ID, the requested action, and the
  last known status (or "Unknown" when none is available) - never assumes success before the
  backend responds, and a failed request leaves the displayed state completely unchanged.

No fake or mock member data is used anywhere in this app. Member search, member listing,
pagination/filtering of members, credit-balance display, and redemption-history display are
all explicitly deferred pending a backend API - see above.

## Subscription Management (Phase 5)

Entry point: a "Manage Subscriptions" button on the Dashboard, leading to `/subscriptions` -
a **read-only** list. Requires an authenticated ADMIN session via the same `ProtectedRoute`
Phase 1 established. This link adds no dashboard card, count, or metric of its own - it is a
plain navigation entry, not a widget backed by its own API call.

### Endpoint consumed

| Purpose | Endpoint | Notes |
| --- | --- | --- |
| List every subscription | `GET /admin/subscriptions` | Admin-only, flat unpaginated array, no query parameters |

### Fields displayed

Exactly the fields `AdminSubscriptionResponse` returns, and nothing else: member email, member
ID, status (`ACTIVE` / `PAST_DUE` / `CANCELLED` - the backend's own enum values, shown as-is),
current period start/end, whether the subscription is set to cancel at period end (shown as a
plain Yes/No), and the payment-failed count (shown as the exact number returned). The status
badge always reflects the backend's own `status` field - it is never inferred from
`cancelAtPeriodEnd`, `paymentFailedCount`, or the period dates.

### Backend limitations (by design, not an incomplete implementation)

**This phase is read-only because the backend itself is read-only here** -
`AdminSubscriptionController` exposes exactly one `@GetMapping`, nothing else:

- **No pagination or filtering endpoint exists.** `getAllSubscriptions()` calls
  `subscriptionRepository.findAll()` directly and returns every row as a plain list - there is
  no `page`/`size`/`status`/`search`/`memberId` query parameter on the backend to send, so this
  app sends none and shows the full list the backend returns, in whatever order it arrives.
  No pagination controls are shown, because pretending to paginate a response the backend
  already returns in full would misrepresent the actual data.
- **No individual subscription GET endpoint exists** - there is no `/admin/subscriptions/{id}`,
  so this app has no per-subscription detail screen or deep link.
- **No admin cancellation or reactivation endpoint exists.** The only subscription-cancel
  endpoint in the entire backend is member-facing (`DELETE /users/me/subscription`) and reads
  its target member from the caller's own JWT - it structurally cannot act on someone else's
  subscription, and this app never calls it. There is no cancel/reactivate button anywhere in
  this screen.
- **No Stripe identifiers are exposed.** `AdminSubscriptionResponse` deliberately omits
  `stripeCustomerId`/`stripeSubscriptionId` (present on the entity, absent from this DTO), and
  also omits `cancelledAt`/`lastPaymentError`. This app cannot show what the backend does not
  return, and does not fabricate them.
- No revenue, MRR/ARR, or churn figures are calculated - the backend exposes no financial
  aggregation endpoint, and this app performs no such calculation client-side.

No fake or mock subscription data, pagination, search, filtering, or mutation of any kind is
used anywhere in this app.

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
│   ├── cafes/    # cafe API calls, types, query keys, hooks, form helpers, CafeForm/
│   │             # CafeStatusDialog components - mirrors mobile/barista-web's own
│   │             # features/<domain>/ convention (introduced in Phase 2, the first
│   │             # domain feature; Phase 1 was pure auth/foundation)
│   ├── drinks/   # drink API calls, types, query keys, hooks, form helpers, DrinkForm/
│   │             # DrinkStatusDialog components (Phase 3)
│   ├── members/  # member API calls (suspend/reactivate only - no list/search/detail
│   │             # endpoint exists), types, query keys, hooks, MemberActionDialog (Phase 4)
│   └── subscriptions/ # a single read-only list call, types, query key, hook (Phase 5) -
│                 # no mutation, no per-subscription detail
├── routes/       # AppRouter, ProtectedRoute, PublicRoute
├── screens/      # Login, Dashboard, CafeList, CafeCreate, CafeDetail,
│                 # DrinkList, DrinkCreate, DrinkDetail, MemberLookup, MemberDetail,
│                 # SubscriptionList
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
